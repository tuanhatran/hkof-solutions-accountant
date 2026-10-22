package fr.hkof.fraisocc.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class NombreEnLettresTest {

    @ParameterizedTest(name = "{0} € → {1}")
    @CsvSource({
            "0.00, zéro euros",
            "1.00, un euro",
            "2.00, deux euros",
            "17.00, dix-sept euros",
            "21.00, vingt et un euros",
            "71.00, soixante et onze euros",
            "80.00, quatre-vingts euros",
            "81.00, quatre-vingt-un euros",
            "91.00, quatre-vingt-onze euros",
            "200.00, deux cents euros",
            "201.00, deux cent un euros",
            "1000.00, mille euros",
            "80000.00, quatre-vingt mille euros",
            "200000.00, deux cent mille euros",
            "364.96, trois cent soixante-quatre euros et quatre-vingt-seize centimes",
            "1234.56, mille deux cent trente-quatre euros et cinquante-six centimes"
    })
    @DisplayName("Convertit les montants en lettres avec les règles françaises")
    void enLettres(String montant, String attendu) {
        assertThat(NombreEnLettres.enLettres(new BigDecimal(montant))).isEqualTo(attendu);
    }

    @Test
    @DisplayName("Un centime se met au singulier")
    void singulierCentime() {
        assertThat(NombreEnLettres.enLettres(new BigDecimal("1.01"))).isEqualTo("un euro et un centime");
    }

    @Test
    @DisplayName("Le montant null renvoie une chaîne vide")
    void montantNull() {
        assertThat(NombreEnLettres.enLettres(null)).isEmpty();
    }
}
