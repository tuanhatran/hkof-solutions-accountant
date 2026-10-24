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
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.Receipt;
import fr.hkof.homeofficeexpenses.repository.ExpenseLineRepository;
import fr.hkof.homeofficeexpenses.repository.ReceiptRepository;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.ReceiptDto;

class ReceiptServiceTest {

    private ReceiptRepository repository;
    private ExpenseLineRepository lineRepository;
    private StorageService storage;
    private ReceiptService service;

    @BeforeEach
    void setUp() {
        repository = mock(ReceiptRepository.class);
        lineRepository = mock(ExpenseLineRepository.class);
        storage = mock(StorageService.class);
        service = new ReceiptService(repository, lineRepository, storage,
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private Receipt receipt(Long id, boolean deleted) {
        Receipt receipt = new Receipt();
        receipt.setId(id);
        receipt.setFileName("facture.pdf");
        receipt.setMimeType("application/pdf");
        receipt.setPath("/tmp/facture.pdf");
        receipt.setSize(12);
        receipt.setDeleted(deleted);
        return receipt;
    }

    @Test
    @DisplayName("Upload stores the file and maps its metadata")
    void upload() {
        when(storage.storeReceipt(any())).thenReturn(
                new StorageService.StoredFile("facture.pdf", "application/pdf", "/tmp/facture.pdf", 12, "hash"));
        when(repository.save(any(Receipt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReceiptDto dto = service.upload(new org.springframework.mock.web.MockMultipartFile(
                "file", "facture.pdf", "application/pdf", new byte[]{1, 2, 3}));

        assertThat(dto.fileName()).isEqualTo("facture.pdf");
        assertThat(dto.mimeType()).isEqualTo("application/pdf");
        assertThat(dto.size()).isEqualTo(12);
        assertThat(dto.createdAt()).isNotNull();
    }

    @Test
    @DisplayName("A deleted or missing receipt is a not found")
    void entityNotFound() {
        when(repository.findById(1L)).thenReturn(Optional.empty());
        when(repository.findById(2L)).thenReturn(Optional.of(receipt(2L, true)));

        assertThatThrownBy(() -> service.entity(1L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Justificatif introuvable.");
        assertThatThrownBy(() -> service.entity(2L))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.get(1L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("Reading a receipt reads its stored path")
    void file() {
        when(repository.findById(1L)).thenReturn(Optional.of(receipt(1L, false)));
        when(storage.read("/tmp/facture.pdf")).thenReturn(new byte[]{1, 2});

        assertThat(service.file(1L)).containsExactly(1, 2);
    }

    @Test
    @DisplayName("A receipt used by a statement cannot be deleted")
    void deleteUsedReceipt() {
        when(repository.findById(1L)).thenReturn(Optional.of(receipt(1L, false)));
        when(lineRepository.existsByReceiptId(1L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ce justificatif est utilisé par une note de frais et ne peut pas être supprimé.");
        verify(repository, never()).save(any(Receipt.class));
    }

    @Test
    @DisplayName("Deleting an unused receipt is logical")
    void deleteUnusedReceipt() {
        Receipt receipt = receipt(1L, false);
        when(repository.findById(1L)).thenReturn(Optional.of(receipt));
        when(lineRepository.existsByReceiptId(1L)).thenReturn(false);
        when(repository.save(any(Receipt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.delete(1L);

        assertThat(receipt.isDeleted()).isTrue();
    }
}
