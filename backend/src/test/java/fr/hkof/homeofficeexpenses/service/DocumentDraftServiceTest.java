package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import tools.jackson.databind.ObjectMapper;

import fr.hkof.homeofficeexpenses.domain.DocumentDraft;
import fr.hkof.homeofficeexpenses.repository.DocumentDraftRepository;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.RentReceiptDraftDto;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.RentReceiptDraftRequest;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.StatementDraftDto;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.StatementDraftRequest;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.ExpenseLineRequest;

class DocumentDraftServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-05T09:30:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    private DocumentDraftRepository repository;
    private DocumentDraftService service;

    @BeforeEach
    void setUp() {
        repository = mock(DocumentDraftRepository.class);
        when(repository.save(any(DocumentDraft.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.saveAndFlush(any(DocumentDraft.class))).thenAnswer(invocation -> invocation.getArgument(0));
        service = new DocumentDraftService(repository, new ObjectMapper(), CLOCK);
    }

    private static RentReceiptDraftRequest rentReceiptRequest() {
        return new RentReceiptDraftRequest(
                "2026-01", 4L, 7L, null,
                "2026-01-01", "2026-01-31", "1 300,00", "50", "2026-01-05", "2026-01-05", 9L);
    }

    private static StatementDraftRequest statementRequest() {
        return new StatementDraftRequest(
                3L, "2026-01", 9L, true,
                List.of(new ExpenseLineRequest("gaz", "80,00", "100", 5L, "MANUAL", null, null)));
    }

    @Test
    @DisplayName("Saves a rent receipt draft, normalising amounts and dates")
    void savesRentReceiptDraft() {
        RentReceiptDraftDto dto = service.saveRentReceipt(rentReceiptRequest());

        ArgumentCaptor<DocumentDraft> captor = ArgumentCaptor.forClass(DocumentDraft.class);
        verify(repository).save(captor.capture());
        DocumentDraft saved = captor.getValue();
        assertThat(saved.getType()).isEqualTo(DocumentDraft.Type.RENT_RECEIPT);
        assertThat(saved.getMonth()).isEqualTo("2026-01");
        assertThat(saved.getLandlordId()).isEqualTo(4L);
        assertThat(saved.getTenantId()).isEqualTo(7L);
        assertThat(saved.getTenantCompanyId()).isNull();
        assertThat(saved.isDeleted()).isFalse();
        assertThat(saved.getSavedAt()).isEqualTo(NOW);
        assertThat(saved.getPayload()).contains("\"rentExclCharges\":\"1300.00\"");
        assertThat(saved.getPayload()).contains("\"periodStart\":\"2026-01-01\"");
        assertThat(dto.savedAt()).isEqualTo(NOW);
        assertThat(dto.rentExclCharges()).isEqualTo("1300.00");
    }

    @Test
    @DisplayName("Logically deletes the previous active draft of the same scope instead of overwriting it")
    void replacesThePreviousActiveDraft() {
        DocumentDraft previous = new DocumentDraft();
        previous.setId(11L);
        previous.setType(DocumentDraft.Type.RENT_RECEIPT);
        when(repository.findFirstByTypeAndMonthAndLandlordIdAndTenantIdAndDeletedFalseOrderByIdDesc(
                DocumentDraft.Type.RENT_RECEIPT, "2026-01", 4L, 7L)).thenReturn(Optional.of(previous));

        service.saveRentReceipt(rentReceiptRequest());

        assertThat(previous.isDeleted()).isTrue();
        verify(repository).saveAndFlush(previous);
        verify(repository).save(org.mockito.ArgumentMatchers.argThat(
                saved -> saved != previous && !saved.isDeleted()));
    }

    @Test
    @DisplayName("Finds the active rent receipt draft of a person or company tenant scope")
    void findsRentReceiptDraft() {
        DocumentDraft stored = new DocumentDraft();
        stored.setId(12L);
        stored.setType(DocumentDraft.Type.RENT_RECEIPT);
        stored.setPayload(service.write(rentReceiptRequest()));
        stored.setSavedAt(NOW);
        when(repository.findFirstByTypeAndMonthAndLandlordIdAndTenantIdAndDeletedFalseOrderByIdDesc(
                DocumentDraft.Type.RENT_RECEIPT, "2026-01", 4L, 7L)).thenReturn(Optional.of(stored));

        Optional<RentReceiptDraftDto> found = service.findRentReceipt("2026-01", 4L, 7L, null);

        assertThat(found).isPresent();
        assertThat(found.get().id()).isEqualTo(12L);
        assertThat(found.get().landlordId()).isEqualTo(4L);
        assertThat(found.get().tenantId()).isEqualTo(7L);
        assertThat(found.get().savedAt()).isEqualTo(NOW);
    }

    @Test
    @DisplayName("Requires exactly one tenant in a rent receipt draft scope")
    void requiresExactlyOneTenant() {
        assertThatThrownBy(() -> service.saveRentReceipt(new RentReceiptDraftRequest(
                "2026-01", 4L, null, null, "2026-01-01", "2026-01-31",
                "1300.00", "0.00", "2026-01-05", "2026-01-05", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("locataire");
        assertThatThrownBy(() -> service.saveRentReceipt(new RentReceiptDraftRequest(
                "2026-01", 4L, 7L, 8L, "2026-01-01", "2026-01-31",
                "1300.00", "0.00", "2026-01-05", "2026-01-05", null)))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.findRentReceipt("2026-01", 4L, null, null))
                .isInstanceOf(BusinessException.class);
        verify(repository, never()).save(any(DocumentDraft.class));
    }

    @Test
    @DisplayName("Rejects an invalid month, amount or date")
    void rejectsInvalidValues() {
        assertThatThrownBy(() -> service.saveRentReceipt(new RentReceiptDraftRequest(
                "2026-13", 4L, 7L, null, "2026-01-01", "2026-01-31",
                "1300.00", "0.00", "2026-01-05", "2026-01-05", null)))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.saveRentReceipt(new RentReceiptDraftRequest(
                "2026-01", 4L, 7L, null, "2026-01-01", "2026-01-31",
                "abc", "0.00", "2026-01-05", "2026-01-05", null)))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.saveRentReceipt(new RentReceiptDraftRequest(
                "2026-01", 4L, 7L, null, "2026-01-31", "2026-01-01",
                "1300.00", "0.00", "2026-01-05", "2026-01-05", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("période");
        assertThatThrownBy(() -> service.saveRentReceipt(new RentReceiptDraftRequest(
                "2026-01", 4L, 7L, null, "2026-01-01", "2026-01-31",
                "1300.00", "0.00", "05/01/2026", "2026-01-05", null)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("Saves and replaces an expense statement draft scoped by company and month")
    void savesStatementDraft() {
        DocumentDraft previous = new DocumentDraft();
        previous.setId(20L);
        when(repository.findFirstByTypeAndMonthAndCompanyIdAndDeletedFalseOrderByIdDesc(
                DocumentDraft.Type.EXPENSE_STATEMENT, "2026-01", 3L)).thenReturn(Optional.of(previous));

        StatementDraftDto dto = service.saveStatement(statementRequest());

        assertThat(previous.isDeleted()).isTrue();
        assertThat(dto.companyId()).isEqualTo(3L);
        assertThat(dto.complete()).isTrue();
        assertThat(dto.lines()).hasSize(1);
        assertThat(dto.lines().get(0).amountInclVat()).isEqualTo("80.00");
        assertThat(dto.savedAt()).isEqualTo(NOW);
    }

    @Test
    @DisplayName("Rejects an expense statement line without item or with an invalid amount")
    void rejectsInvalidStatementLines() {
        assertThatThrownBy(() -> service.saveStatement(new StatementDraftRequest(
                3L, "2026-01", null, true,
                List.of(new ExpenseLineRequest("", "80.00", "100", null, "MANUAL", null, null)))))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.saveStatement(new StatementDraftRequest(
                3L, "2026-01", null, true,
                List.of(new ExpenseLineRequest("gaz", "80.00", "101", null, "MANUAL", null, null)))))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.saveStatement(new StatementDraftRequest(
                null, "2026-01", null, true, List.of())))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("Logically deletes a draft by id")
    void deletesDraft() {
        DocumentDraft draft = new DocumentDraft();
        draft.setId(5L);
        when(repository.findById(5L)).thenReturn(Optional.of(draft));

        service.delete(5L);

        assertThat(draft.isDeleted()).isTrue();
        verify(repository).saveAndFlush(draft);
    }

    @Test
    @DisplayName("Clears the active rent receipt draft of a generation scope")
    void clearsActiveRentReceiptDraft() {
        DocumentDraft previous = new DocumentDraft();
        previous.setId(31L);
        when(repository.findFirstByTypeAndMonthAndLandlordIdAndTenantIdAndDeletedFalseOrderByIdDesc(
                DocumentDraft.Type.RENT_RECEIPT, "2026-01", 4L, 7L)).thenReturn(Optional.of(previous));

        service.deleteActiveRentReceipt("2026-01", 4L, 7L, null);

        assertThat(previous.isDeleted()).isTrue();
        verify(repository).saveAndFlush(previous);
    }

    @Test
    @DisplayName("Clears nothing when the generation scope holds no rent receipt draft")
    void ignoresMissingRentReceiptDraft() {
        when(repository.findFirstByTypeAndMonthAndLandlordIdAndTenantCompanyIdAndDeletedFalseOrderByIdDesc(
                DocumentDraft.Type.RENT_RECEIPT, "2026-01", 4L, 9L)).thenReturn(Optional.empty());

        service.deleteActiveRentReceipt("2026-01", 4L, null, 9L);

        verify(repository, never()).save(any(DocumentDraft.class));
        verify(repository, never()).saveAndFlush(any(DocumentDraft.class));
    }

    @Test
    @DisplayName("Clears the active expense statement draft of a company and month")
    void clearsActiveStatementDraft() {
        DocumentDraft previous = new DocumentDraft();
        previous.setId(32L);
        when(repository.findFirstByTypeAndMonthAndCompanyIdAndDeletedFalseOrderByIdDesc(
                DocumentDraft.Type.EXPENSE_STATEMENT, "2026-01", 3L)).thenReturn(Optional.of(previous));

        service.deleteActiveStatement(3L, "2026-01");

        assertThat(previous.isDeleted()).isTrue();
        verify(repository).saveAndFlush(previous);
    }

    @Test
    @DisplayName("Rejects deleting an unknown draft")
    void rejectsUnknownDraft() {
        when(repository.findById(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(5L)).isInstanceOf(NotFoundException.class);
    }
}
