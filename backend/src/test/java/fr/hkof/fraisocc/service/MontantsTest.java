package fr.hkof.fraisocc.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.YearMonth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MontantsTest {

    @Test
    @DisplayName("Accepte les montants avec virgule, point, espaces et symbole euro")
    void decimalSouple() {
        assertThat(Montants.decimal("80,50", "montant", true)).isEqualByComparingTo("80.50");
        assertThat(Montants.decimal("1 234,56 €", "montant", true)).isEqualByComparingTo("1234.56");
        assertThat(Montants.decimal("80.5", "montant", true)).isEqualByComparingTo("80.50");
    }

    @Test
    @DisplayName("Refuse un montant négatif ou nul quand il doit être positif")
    void decimalPositif() {
        assertThatThrownBy(() -> Montants.decimal("0", "montant", true))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("strictement positif");
        assertThat(Montants.decimal("0", "montant", false)).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("Accepte les proratas avec ou sans %, virgule et espaces")
    void pourcentageSouple() {
        assertThat(Montants.pourcentage("35,71")).isEqualByComparingTo("35.71");
        assertThat(Montants.pourcentage("35.71 %")).isEqualByComparingTo("35.71");
        assertThat(Montants.pourcentage(" 50% ")).isEqualByComparingTo("50.00");
        assertThat(Montants.pourcentage("0")).isEqualByComparingTo("0.00");
        assertThat(Montants.pourcentage("100")).isEqualByComparingTo("100.00");
    }

    @Test
    @DisplayName("Refuse plus de deux décimales de prorata")
    void prorataPrecision() {
        assertThatThrownBy(() -> Montants.pourcentage("35.712"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("deux décimales");
    }

    @Test
    @DisplayName("Formate les montants à la française")
    void formatFrancais() {
        assertThat(Montants.formatEUR(new BigDecimal("1234.5"))).isEqualTo("1\u00A0234,50\u00A0€");
        assertThat(Montants.formatPourcentage(new BigDecimal("35.71"))).isEqualTo("35,71\u00A0%");
        assertThat(Montants.valeurApi(new BigDecimal("1234.5"))).isEqualTo("1234.50");
    }

    @Test
    @DisplayName("Formate les mois en français")
    void moisFrancais() {
        assertThat(Montants.formatMois(YearMonth.of(2026, 2))).isEqualTo("Février 2026");
        assertThat(Montants.mois("2026-02")).isEqualTo(YearMonth.of(2026, 2));
    }
}
