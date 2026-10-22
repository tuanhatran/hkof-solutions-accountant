package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class StorageServiceTest {

    @Test
    @DisplayName("Assainit les chemins, caractères interdits et noms réservés Windows")
    void assainirName() {
        assertThat(StorageService.assainirName("facture.pdf")).isEqualTo("facture.pdf");
        assertThat(StorageService.assainirName("../../etc/passwd")).isEqualTo("passwd");
        assertThat(StorageService.assainirName("dossier\\..\\evil.pdf")).isEqualTo("evil.pdf");
        assertThat(StorageService.assainirName("a<b>c.pdf")).isEqualTo("a_b_c.pdf");
        assertThat(StorageService.assainirName("CON.txt")).isEqualTo("_CON.txt");
        assertThat(StorageService.assainirName("con")).isEqualTo("_con");
        assertThat(StorageService.assainirName("facture.pdf...")).isEqualTo("facture.pdf");
        assertThat(StorageService.assainirName("   ")).isEqualTo("fichier");
        assertThat(StorageService.assainirName(null)).isEqualTo("fichier");
    }

    @Test
    @DisplayName("Conserve l’extension en tronquant un nom très long")
    void nameLongTronque() {
        String name = "a".repeat(250) + ".pdf";
        String assaini = StorageService.assainirName(name);
        assertThat(assaini).hasSize(180);
        assertThat(assaini).endsWith(".pdf");
    }
}
