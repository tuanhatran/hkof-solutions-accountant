package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class StorageServiceTest {

    @Test
    @DisplayName("Sanitizes paths, forbidden characters and Windows reserved names")
    void sanitizesName() {
        assertThat(StorageService.sanitizeName("facture.pdf")).isEqualTo("facture.pdf");
        assertThat(StorageService.sanitizeName("../../etc/passwd")).isEqualTo("passwd");
        assertThat(StorageService.sanitizeName("dossier\\..\\evil.pdf")).isEqualTo("evil.pdf");
        assertThat(StorageService.sanitizeName("a<b>c.pdf")).isEqualTo("a_b_c.pdf");
        assertThat(StorageService.sanitizeName("CON.txt")).isEqualTo("_CON.txt");
        assertThat(StorageService.sanitizeName("con")).isEqualTo("_con");
        assertThat(StorageService.sanitizeName("facture.pdf...")).isEqualTo("facture.pdf");
        assertThat(StorageService.sanitizeName("   ")).isEqualTo("fichier");
        assertThat(StorageService.sanitizeName(null)).isEqualTo("fichier");
    }

    @Test
    @DisplayName("Keeps the extension when truncating a very long name")
    void longNameTruncated() {
        String name = "a".repeat(250) + ".pdf";
        String assaini = StorageService.sanitizeName(name);
        assertThat(assaini).hasSize(180);
        assertThat(assaini).endsWith(".pdf");
    }
}
