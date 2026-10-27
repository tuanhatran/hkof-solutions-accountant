package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.Periodicity;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.web.dto.ExpenseItemDtos.ExpenseItemDto;
import fr.hkof.homeofficeexpenses.web.dto.ExpenseItemDtos.ExpenseItemRequest;

class ExpenseItemServiceTest {

    private static final Long COMPANY_ID = 1L;

    private ExpenseItemRepository repository;
    private CompanyService companies;
    private LeaseService leases;
    private ExpenseItemService service;

    @BeforeEach
    void setUp() {
        repository = mock(ExpenseItemRepository.class);
        companies = mock(CompanyService.class);
        leases = mock(LeaseService.class);
        service = new ExpenseItemService(repository, companies, leases);
    }

    private ExpenseItem item(Long id, String code, String label, boolean deleted) {
        return item(id, code, label, deleted, null);
    }

    private ExpenseItem item(Long id, String code, String label, boolean deleted, Long leaseId) {
        ExpenseItem item = new ExpenseItem();
        item.setId(id);
        item.setCompanyId(COMPANY_ID);
        item.setLeaseId(leaseId);
        item.setCode(code);
        item.setLabel(label);
        item.setSupplier("EDF");
        item.setProRataPct(new BigDecimal("35.71"));
        item.setPeriodicity(Periodicity.MONTHLY);
        item.setActive(true);
        item.setSortOrder(10);
        item.setDeleted(deleted);
        return item;
    }

    private ExpenseItemRequest request(String code, String label, String periodicity) {
        return new ExpenseItemRequest(COMPANY_ID, null, code, label, "  EDF  ", "35,71", periodicity, null, null, null);
    }

    @Test
    @DisplayName("Lists active items or every non deleted item")
    void lists() {
        when(repository.findByCompanyIdAndDeletedFalseOrderBySortOrderAscIdAsc(COMPANY_ID))
                .thenReturn(List.of(item(1L, "gaz", "Gaz", false)));
        when(repository.findByCompanyIdAndDeletedFalseAndActiveTrueOrderBySortOrderAscIdAsc(COMPANY_ID))
                .thenReturn(List.of(item(2L, "loyer", "Loyer", false)));

        assertThat(service.list(COMPANY_ID, null, true)).extracting(ExpenseItemDto::code).containsExactly("gaz");
        assertThat(service.list(COMPANY_ID, null, false)).extracting(ExpenseItemDto::code).containsExactly("loyer");
    }

    @Test
    @DisplayName("An unknown code is rejected in French")
    void entityNotFound() {
        when(repository.findByCompanyIdAndCodeAndDeletedFalse(COMPANY_ID, "inconnu")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.entity(COMPANY_ID, "inconnu"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Type de frais inconnu : inconnu")
                .satisfies(ex -> {
                    assertThat(((BusinessException) ex).getCode()).isEqualTo("EXPENSE_ITEM_UNKNOWN_CODE");
                    assertThat(((BusinessException) ex).getParams()).containsEntry("code", "inconnu");
                });
    }

    @Test
    @DisplayName("An existing code is returned")
    void entityFound() {
        when(repository.findByCompanyIdAndCodeAndDeletedFalse(COMPANY_ID, "gaz"))
                .thenReturn(Optional.of(item(1L, "gaz", "Gaz", false)));
        assertThat(service.entity(COMPANY_ID, "gaz").getLabel()).isEqualTo("Gaz");
    }

    @Test
    @DisplayName("A missing label is rejected on create")
    void createRequiresLabel() {
        assertThatThrownBy(() -> service.create(request(null, " ", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le libellé du poste est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("EXPENSE_ITEM_LABEL_REQUIRED"));
        assertThatThrownBy(() -> service.create(request(null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le libellé du poste est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("EXPENSE_ITEM_LABEL_REQUIRED"));
    }

    @Test
    @DisplayName("A blank code is generated from the label and normalized")
    void createGeneratesCode() {
        when(repository.existsByCompanyIdAndCode(COMPANY_ID, "assurance_habitation")).thenReturn(false);
        when(repository.save(any(ExpenseItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExpenseItemDto dto = service.create(request(null, "Assurance habitation", null));

        assertThat(dto.code()).isEqualTo("assurance_habitation");
        assertThat(dto.periodicity()).isEqualTo("MONTHLY");
        assertThat(dto.active()).isTrue();
        assertThat(dto.sortOrder()).isZero();
        assertThat(dto.multipleLinesAllowed()).isFalse();
    }

    @Test
    @DisplayName("A provided code is normalized and an existing code is rejected")
    void createNormalizesAndRejectsDuplicate() {
        when(repository.existsByCompanyIdAndCode(COMPANY_ID, "electricite")).thenReturn(true);
        assertThatThrownBy(() -> service.create(request("Électricité", "Électricité", "MONTHLY")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Un poste avec le code « electricite » existe déjà.")
                .satisfies(ex -> {
                    assertThat(((BusinessException) ex).getCode()).isEqualTo("EXPENSE_ITEM_CODE_DUPLICATE");
                    assertThat(((BusinessException) ex).getParams()).containsEntry("code", "electricite");
                });
    }

    @Test
    @DisplayName("A code made only of forbidden characters is rejected")
    void createRejectsBlankNormalizedCode() {
        assertThatThrownBy(() -> service.create(request("!!!", "Libellé", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le code du poste est invalide.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("EXPENSE_ITEM_CODE_INVALID"));
    }

    @Test
    @DisplayName("An invalid periodicity is rejected in French")
    void createRejectsInvalidPeriodicity() {
        assertThatThrownBy(() -> service.create(request("gaz", "Gaz", "HEBDOMADAIRE")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Périodicité invalide : HEBDOMADAIRE")
                .satisfies(ex -> {
                    assertThat(((BusinessException) ex).getCode()).isEqualTo("EXPENSE_ITEM_PERIODICITY_INVALID");
                    assertThat(((BusinessException) ex).getParams()).containsEntry("periodicity", "HEBDOMADAIRE");
                });
    }

    @Test
    @DisplayName("A blank periodicity falls back to monthly and explicit values are applied")
    void updateAppliesValues() {
        when(repository.findById(1L)).thenReturn(Optional.of(item(1L, "gaz", "Gaz", false)));
        when(repository.save(any(ExpenseItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExpenseItemDto dto = service.update(1L,
                new ExpenseItemRequest(COMPANY_ID, null, null, " Gaz ", " EDF ", "50", " annual ", false, 7, true));

        assertThat(dto.label()).isEqualTo("Gaz");
        assertThat(dto.supplier()).isEqualTo("EDF");
        assertThat(dto.periodicity()).isEqualTo("ANNUAL");
        assertThat(dto.active()).isFalse();
        assertThat(dto.sortOrder()).isEqualTo(7);
        assertThat(dto.multipleLinesAllowed()).isTrue();
    }

    @Test
    @DisplayName("Updating a missing label is rejected")
    void updateRequiresLabel() {
        when(repository.findById(1L)).thenReturn(Optional.of(item(1L, "gaz", "Gaz", false)));
        assertThatThrownBy(() -> service.update(1L, request(null, " ", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le libellé du poste est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("EXPENSE_ITEM_LABEL_REQUIRED"));
    }

    @Test
    @DisplayName("Updating or deleting a missing or deleted item is a not found")
    void updateAndDeleteNotFound() {
        when(repository.findById(9L)).thenReturn(Optional.empty());
        when(repository.findById(8L)).thenReturn(Optional.of(item(8L, "gaz", "Gaz", true)));

        assertThatThrownBy(() -> service.update(9L, request("gaz", "Gaz", null)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Poste introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode())
                        .isEqualTo("EXPENSE_ITEM_NOT_FOUND"));
        assertThatThrownBy(() -> service.update(8L, request("gaz", "Gaz", null)))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.delete(9L))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.delete(8L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("Deleting an item marks it deleted and inactive")
    void deleteLogical() {
        ExpenseItem item = item(1L, "gaz", "Gaz", false);
        when(repository.findById(1L)).thenReturn(Optional.of(item));
        when(repository.save(any(ExpenseItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.delete(1L);

        assertThat(item.isDeleted()).isTrue();
        assertThat(item.isActive()).isFalse();
        verify(repository).save(item);
    }

    @Test
    @DisplayName("Items created with a lease keep it and the lease filter keeps legacy rows")
    void createsAndFiltersByLease() {
        Lease lease = new Lease();
        lease.setId(5L);
        lease.setCompanyId(COMPANY_ID);
        when(leases.resolveExpenseLease(COMPANY_ID, 5L)).thenReturn(lease);
        when(repository.existsByCompanyIdAndCode(COMPANY_ID, "eau")).thenReturn(false);
        when(repository.save(any(ExpenseItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExpenseItemDto created = service.create(new ExpenseItemRequest(
                COMPANY_ID, 5L, "eau", "Eau", null, "20", null, null, null, null));
        assertThat(created.leaseId()).isEqualTo(5L);

        when(repository.findByCompanyIdAndDeletedFalseAndActiveTrueOrderBySortOrderAscIdAsc(COMPANY_ID))
                .thenReturn(List.of(item(1L, "eau", "Eau", false, 5L), item(2L, "heritage", "Hérité", false),
                        item(3L, "autre", "Autre bail", false, 6L)));
        assertThat(service.list(COMPANY_ID, 5L, false)).extracting(ExpenseItemDto::code)
                .containsExactly("eau", "heritage");
    }

    @Test
    @DisplayName("A lease of another company is rejected on create in French")
    void createRejectsForeignLease() {
        when(leases.resolveExpenseLease(COMPANY_ID, 6L))
                .thenThrow(new BusinessException("Ce bail n'appartient pas à la société."));
        assertThatThrownBy(() -> service.create(new ExpenseItemRequest(
                COMPANY_ID, 6L, "vol", "Volé", null, "10", null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ce bail n'appartient pas à la société.");
    }
}
