package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.YearMonth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AmountsTest {

    @Test
    @DisplayName("Accepte les montants avec virgule, point, espaces et symbole euro")
    void decimalSouple() {
        assertThat(Amounts.decimal("80,50", "montant", true)).isEqualByComparingTo("80.50");
        assertThat(Amounts.decimal("1 234,56 €", "montant", true)).isEqualByComparingTo("1234.56");
        assertThat(Amounts.decimal("80.5", "montant", true)).isEqualByComparingTo("80.50");
    }

    @Test
    @DisplayName("Refuse un montant négatif ou nul quand il doit être positif")
    void decimalPositif() {
        assertThatThrownBy(() -> Amounts.decimal("0", "montant", true))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("strictement positif");
        assertThat(Amounts.decimal("0", "montant", false)).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("Accepte les proratas avec ou sans %, virgule et espaces")
    void pourcentageSouple() {
        assertThat(Amounts.pourcentage("35,71")).isEqualByComparingTo("35.71");
        assertThat(Amounts.pourcentage("35.71 %")).isEqualByComparingTo("35.71");
        assertThat(Amounts.pourcentage(" 50% ")).isEqualByComparingTo("50.00");
        assertThat(Amounts.pourcentage("0")).isEqualByComparingTo("0.00");
        assertThat(Amounts.pourcentage("100")).isEqualByComparingTo("100.00");
    }

    @Test
    @DisplayName("Refuse plus de deux décimales de prorata")
    void prorataPrecision() {
        assertThatThrownBy(() -> Amounts.pourcentage("35.712"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("deux décimales");
    }

    @Test
    @DisplayName("Formate les montants à la française")
    void formatFrancais() {
        assertThat(Amounts.formatEUR(new BigDecimal("1234.5"))).isEqualTo("1\u00A0234,50\u00A0€");
        assertThat(Amounts.formatPourcentage(new BigDecimal("35.71"))).isEqualTo("35,71\u00A0%");
        assertThat(Amounts.apiValue(new BigDecimal("1234.5"))).isEqualTo("1234.50");
    }

    @Test
    @DisplayName("Formate les mois en français")
    void monthFrancais() {
        assertThat(Amounts.formatMonth(YearMonth.of(2026, 2))).isEqualTo("Février 2026");
        assertThat(Amounts.month("2026-02")).isEqualTo(YearMonth.of(2026, 2));
    }
}
