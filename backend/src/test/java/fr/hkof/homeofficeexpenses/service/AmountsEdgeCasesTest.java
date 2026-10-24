package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AmountsEdgeCasesTest {

    @Test
    @DisplayName("A missing or blank amount is rejected with a French message")
    void decimalRequiresValue() {
        assertThatThrownBy(() -> Amounts.decimal(null, "montant TTC", true))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le champ « montant TTC » est obligatoire.");
        assertThatThrownBy(() -> Amounts.decimal("  ", "loyer", false))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("obligatoire");
    }

    @Test
    @DisplayName("A non numeric amount is rejected with a French message")
    void decimalRejectsLetters() {
        assertThatThrownBy(() -> Amounts.decimal("douze euros", "montant", true))
                .isInstanceOf(BusinessException.class)
                .hasMessage("« douze euros » n'est pas un nombre valide pour « montant ».");
    }

    @Test
    @DisplayName("A negative amount is rejected when zero is allowed")
    void decimalRejectsNegativeWhenNotStrict() {
        assertThatThrownBy(() -> Amounts.decimal("-1", "charges", false))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le champ « charges » doit être positif ou nul.");
    }

    @Test
    @DisplayName("An optional amount is null when absent and parsed otherwise")
    void optionalDecimal() {
        assertThat(Amounts.optionalDecimal(null, "surface")).isNull();
        assertThat(Amounts.optionalDecimal(" ", "surface")).isNull();
        assertThat(Amounts.optionalDecimal("70", "surface")).isEqualByComparingTo("70.00");
    }

    @Test
    @DisplayName("A missing or invalid pro-rata value is rejected")
    void percentageErrors() {
        assertThatThrownBy(() -> Amounts.percentage(null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le prorata est obligatoire.");
        assertThatThrownBy(() -> Amounts.percentage(" "))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le prorata est obligatoire.");
        assertThatThrownBy(() -> Amounts.percentage("beaucoup"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("« beaucoup » n'est pas un pourcentage valide.");
    }

    @Test
    @DisplayName("A pro-rata value outside 0..100 is rejected with a French message")
    void percentageRange() {
        assertThatThrownBy(() -> Amounts.percentage("-1"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le prorata doit être compris entre 0 et 100 %.");
        assertThatThrownBy(() -> Amounts.percentage("101"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le prorata doit être compris entre 0 et 100 %.");
    }

    @Test
    @DisplayName("An optional date is null when absent, parsed otherwise and rejected when malformed")
    void optionalDate() {
        assertThat(Amounts.optionalDate(null, "date")).isNull();
        assertThat(Amounts.optionalDate(" ", "date")).isNull();
        assertThat(Amounts.optionalDate("2026-10-01", "date")).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThatThrownBy(() -> Amounts.optionalDate("01/10/2026", "date"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La date « date » doit être au format AAAA-MM-JJ.");
    }

    @Test
    @DisplayName("A missing or malformed month is rejected with a French message")
    void monthErrors() {
        assertThatThrownBy(() -> Amounts.month(null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le mois est obligatoire (format AAAA-MM).");
        assertThatThrownBy(() -> Amounts.month(" "))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le mois est obligatoire (format AAAA-MM).");
        assertThatThrownBy(() -> Amounts.month("10/2026"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le mois doit être au format AAAA-MM.");
        assertThat(Amounts.month(" 2026-10 ")).isEqualTo(YearMonth.of(2026, 10));
    }

    @Test
    @DisplayName("Formatting null values returns empty strings")
    void formatsNullsAsEmpty() {
        assertThat(Amounts.formatEUR(null)).isEmpty();
        assertThat(Amounts.formatPercentage(null)).isEmpty();
        assertThat(Amounts.formatDate(null)).isEmpty();
        assertThat(Amounts.apiValue(null)).isNull();
    }

    @Test
    @DisplayName("API values always carry two decimals")
    void apiValueScale() {
        assertThat(Amounts.apiValue(new BigDecimal("12.3"))).isEqualTo("12.30");
        assertThat(Amounts.apiValue(new BigDecimal("12.345"))).isEqualTo("12.35");
    }
}
