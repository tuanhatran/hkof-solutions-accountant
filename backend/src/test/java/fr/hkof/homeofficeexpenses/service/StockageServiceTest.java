package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class StockageServiceTest {

    @Test
    @DisplayName("Assainit les chemins, caractères interdits et noms réservés Windows")
    void assainirNom() {
        assertThat(StockageService.assainirNom("facture.pdf")).isEqualTo("facture.pdf");
        assertThat(StockageService.assainirNom("../../etc/passwd")).isEqualTo("passwd");
        assertThat(StockageService.assainirNom("dossier\\..\\evil.pdf")).isEqualTo("evil.pdf");
        assertThat(StockageService.assainirNom("a<b>c.pdf")).isEqualTo("a_b_c.pdf");
        assertThat(StockageService.assainirNom("CON.txt")).isEqualTo("_CON.txt");
        assertThat(StockageService.assainirNom("con")).isEqualTo("_con");
        assertThat(StockageService.assainirNom("facture.pdf...")).isEqualTo("facture.pdf");
        assertThat(StockageService.assainirNom("   ")).isEqualTo("fichier");
        assertThat(StockageService.assainirNom(null)).isEqualTo("fichier");
    }

    @Test
    @DisplayName("Conserve l’extension en tronquant un nom très long")
    void nomLongTronque() {
        String nom = "a".repeat(250) + ".pdf";
        String assaini = StockageService.assainirNom(nom);
        assertThat(assaini).hasSize(180);
        assertThat(assaini).endsWith(".pdf");
    }
}
