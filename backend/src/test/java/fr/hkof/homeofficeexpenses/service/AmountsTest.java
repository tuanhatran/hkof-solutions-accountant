package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.YearMonth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AmountsTest {

    @Test
    @DisplayName("Accepts amounts with comma, dot, spaces and euro symbol")
    void lenientDecimal() {
        assertThat(Amounts.decimal("80,50", "montant", true)).isEqualByComparingTo("80.50");
        assertThat(Amounts.decimal("1 234,56 €", "montant", true)).isEqualByComparingTo("1234.56");
        assertThat(Amounts.decimal("80.5", "montant", true)).isEqualByComparingTo("80.50");
    }

    @Test
    @DisplayName("Rejects a negative or zero amount when it must be positive")
    void positiveDecimal() {
        assertThatThrownBy(() -> Amounts.decimal("0", "montant", true))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("strictement positif");
        assertThat(Amounts.decimal("0", "montant", false)).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("Accepts pro-rata values with or without %, comma and spaces")
    void lenientPercentage() {
        assertThat(Amounts.percentage("35,71")).isEqualByComparingTo("35.71");
        assertThat(Amounts.percentage("35.71 %")).isEqualByComparingTo("35.71");
        assertThat(Amounts.percentage(" 50% ")).isEqualByComparingTo("50.00");
        assertThat(Amounts.percentage("0")).isEqualByComparingTo("0.00");
        assertThat(Amounts.percentage("100")).isEqualByComparingTo("100.00");
    }

    @Test
    @DisplayName("Rejects more than two decimals in a pro-rata value")
    void proRataPrecision() {
        assertThatThrownBy(() -> Amounts.percentage("35.712"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("deux décimales");
    }

    @Test
    @DisplayName("Formats amounts in French style")
    void formatsFrench() {
        assertThat(Amounts.formatEUR(new BigDecimal("1234.5"))).isEqualTo("1\u00A0234,50\u00A0€");
        assertThat(Amounts.formatPercentage(new BigDecimal("35.71"))).isEqualTo("35,71\u00A0%");
        assertThat(Amounts.apiValue(new BigDecimal("1234.5"))).isEqualTo("1234.50");
    }

    @Test
    @DisplayName("Formats months in French")
    void monthsFrench() {
        assertThat(Amounts.formatMonth(YearMonth.of(2026, 2))).isEqualTo("Février 2026");
        assertThat(Amounts.month("2026-02")).isEqualTo(YearMonth.of(2026, 2));
    }
}
