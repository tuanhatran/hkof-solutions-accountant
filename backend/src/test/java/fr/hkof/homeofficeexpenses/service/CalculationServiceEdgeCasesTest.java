package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CalculationServiceEdgeCasesTest {

    @Test
    @DisplayName("A claimed amount requires both the monthly amount and the pro-rata")
    void claimedAmountRequiresBoth() {
        assertThatThrownBy(() -> CalculationService.claimedAmount(null, new BigDecimal("50")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le montant du mois et le prorata sont obligatoires.");
        assertThatThrownBy(() -> CalculationService.claimedAmount(new BigDecimal("10"), null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le montant du mois et le prorata sont obligatoires.");
    }

    @Test
    @DisplayName("A negative pro-rata is rejected")
    void claimedAmountRejectsNegativeProRata() {
        assertThatThrownBy(() -> CalculationService.claimedAmount(new BigDecimal("10"), new BigDecimal("-1")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("prorata");
    }

    @Test
    @DisplayName("The total of no lines is zero with two decimals")
    void totalOfNullIsZero() {
        assertThat(CalculationService.total(null)).isEqualByComparingTo("0.00");
        assertThat(CalculationService.total(null).scale()).isEqualTo(2);
        assertThat(CalculationService.total(java.util.List.of())).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("The pro-rata base is zero when an area is missing or the total area is zero")
    void proRataBaseDegenerateAreas() {
        assertThat(CalculationService.proRataBase(null, new BigDecimal("70"))).isEqualByComparingTo("0.00");
        assertThat(CalculationService.proRataBase(new BigDecimal("25"), null)).isEqualByComparingTo("0.00");
        assertThat(CalculationService.proRataBase(new BigDecimal("25"), BigDecimal.ZERO)).isEqualByComparingTo("0.00");
        assertThat(CalculationService.proRataBase(new BigDecimal("25"), new BigDecimal("-70")))
                .isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("A negative business area is rejected")
    void proRataBaseRejectsNegativeBusinessArea() {
        assertThatThrownBy(() -> CalculationService.proRataBase(new BigDecimal("-1"), new BigDecimal("70")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("surface");
    }

    @Test
    @DisplayName("The rent receipt total adds rent and charges with two decimals")
    void totalRentReceipt() {
        assertThat(CalculationService.totalRentReceipt(new BigDecimal("900"), new BigDecimal("50")))
                .isEqualByComparingTo("950.00");
    }

    @Test
    @DisplayName("A negative VAT rate is rejected")
    void grossFromNetRejectsNegativeRate() {
        assertThatThrownBy(() -> CalculationService.grossFromNet(new BigDecimal("80"), new BigDecimal("-1")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("taux");
    }
}
