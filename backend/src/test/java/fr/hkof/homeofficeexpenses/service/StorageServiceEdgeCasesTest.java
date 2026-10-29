package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import fr.hkof.homeofficeexpenses.config.AppProperties;

class StorageServiceEdgeCasesTest {

    @TempDir
    Path tempDir;

    private StorageService storage(Path root) {
        return new StorageService(new AppProperties(root.toString(), List.of(), null), new FileTypeDetector());
    }

    @Test
    @DisplayName("The data directories and root are created on startup")
    void initializesDirectories() {
        StorageService storage = storage(tempDir.resolve("data"));

        assertThat(storage.root()).isDirectory();
        assertThat(storage.root().resolve("justificatifs")).isDirectory();
        assertThat(storage.root().resolve("sorties")).isDirectory();
        assertThat(storage.root().resolve("templates")).isDirectory();
    }

    @Test
    @DisplayName("An unusable data directory fails at startup in French")
    void initFailure() throws IOException {
        Path file = Files.createTempFile(tempDir, "data", ".txt");
        assertThatThrownBy(() -> storage(file))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("data directory");
    }

    @Test
    @DisplayName("An empty or missing receipt file is rejected")
    void storeReceiptRequiresFile() {
        StorageService storage = storage(tempDir.resolve("data"));

        assertThatThrownBy(() -> storage.storeReceipt(null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le fichier justificatif est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("RECEIPT_FILE_REQUIRED"));
        assertThatThrownBy(() -> storage.storeReceipt(new MockMultipartFile(
                "file", "vide.txt", "text/plain", new byte[0])))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("A receipt read failure is wrapped in a French message")
    void storeReceiptReadFailure() throws IOException {
        StorageService storage = storage(tempDir.resolve("data"));
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getBytes()).thenThrow(new IOException("boom"));

        assertThatThrownBy(() -> storage.storeReceipt(file))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Impossible d'enregistrer le justificatif.");
    }

    @Test
    @DisplayName("A valid receipt is stored with a hash and a sanitized name")
    void storeReceipt() {
        StorageService storage = storage(tempDir.resolve("data"));
        byte[] content = "EDF Gaz total 78,00".getBytes(StandardCharsets.UTF_8);

        StorageService.StoredFile stored = storage.storeReceipt(
                new MockMultipartFile("file", "facture-gaz.txt", "text/plain", content));

        assertThat(stored.fileName()).isEqualTo("facture-gaz.txt");
        assertThat(stored.mimeType()).isEqualTo("text/plain");
        assertThat(stored.size()).isEqualTo(content.length);
        assertThat(stored.hashSha256()).hasSize(64);
        assertThat(Path.of(stored.path())).exists();
    }

    @Test
    @DisplayName("Templates and PDFs are stored under the data directory")
    void storeTemplateAndPdf() {
        StorageService storage = storage(tempDir.resolve("data"));

        String template = storage.storeTemplate("<html></html>".getBytes(StandardCharsets.UTF_8), "RENT_RECEIPT", 2);
        String pdf = storage.storePdf("sous/dossier/note.pdf", new byte[]{1, 2, 3});

        assertThat(Path.of(template)).hasFileName("rent_receipt_v2.html");
        assertThat(Path.of(pdf)).exists();
        assertThat(storage.read(pdf)).containsExactly(1, 2, 3);
    }

    @Test
    @DisplayName("User-scoped templates embed the owner ID in the file name")
    void storeTemplateWithUserId() {
        StorageService storage = storage(tempDir.resolve("data"));

        String template = storage.storeTemplate(42L, "<html></html>".getBytes(StandardCharsets.UTF_8), "RENT_RECEIPT", 2);

        assertThat(Path.of(template)).hasFileName("u42_rent_receipt_v2.html");
        assertThat(Path.of(template)).exists();
    }

    @Test
    @DisplayName("Storage failures are wrapped in French messages")
    void storeTemplateAndPdfFailures() throws IOException {
        Path root = tempDir.resolve("data");
        StorageService storage = storage(root);
        Files.delete(root.resolve("templates"));
        Files.writeString(root.resolve("templates"), "blocking");
        assertThatThrownBy(() -> storage.storeTemplate(new byte[]{1}, "RENT_RECEIPT", 1))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Impossible d'enregistrer le template.");

        Files.delete(root.resolve("sorties"));
        Files.writeString(root.resolve("sorties"), "blocking");
        assertThatThrownBy(() -> storage.storePdf("note.pdf", new byte[]{1}))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Impossible d'enregistrer le PDF.");
    }

    @Test
    @DisplayName("A PDF path escaping the data directory is refused")
    void storePdfTraversal() {
        StorageService storage = storage(tempDir.resolve("data"));
        assertThatThrownBy(() -> storage.storePdf("../../evade.pdf", new byte[]{1}))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Accès fichier refusé.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("FILE_ACCESS_DENIED"));
    }

    @Test
    @DisplayName("Reading a missing, blank or outside path fails in French")
    void readErrors() {
        StorageService storage = storage(tempDir.resolve("data"));

        assertThatThrownBy(() -> storage.read(null))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Fichier introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("FILE_NOT_FOUND"));
        assertThatThrownBy(() -> storage.read(" "))
                .isInstanceOf(NotFoundException.class)
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("FILE_NOT_FOUND"));
        assertThatThrownBy(() -> storage.read("/etc/hosts"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Accès fichier refusé.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("FILE_ACCESS_DENIED"));
        assertThatThrownBy(() -> storage.read(storage.root().resolve("absent.pdf").toString()))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Fichier introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("FILE_NOT_FOUND"));
        assertThatThrownBy(() -> storage.read("classpath:absent/absent.html"))
                .isInstanceOf(NotFoundException.class)
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("FILE_NOT_FOUND"));
    }

    @Test
    @DisplayName("Classpath resources are readable")
    void readClasspath() {
        StorageService storage = storage(tempDir.resolve("data"));
        byte[] content = storage.read("classpath:templates/defaut/quittance.html");
        assertThat(new String(content, StandardCharsets.UTF_8)).contains("QUITTANCE");
    }

    @Test
    @DisplayName("A temporary file is created with the sanitized name")
    void temporaryPath() {
        StorageService storage = storage(tempDir.resolve("data"));
        String path = storage.temporaryPath("../facture.pdf", new byte[]{1, 2});
        assertThat(Path.of(path)).hasFileName("facture.pdf").exists();
    }
}
