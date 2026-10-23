package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CalculationServiceTest {

    @Test
    @DisplayName("The monthly amount is the invoice amount including VAT")
    void monthlyAmountFromInvoice() {
        assertThat(CalculationService.monthlyAmount(new BigDecimal("80.5")))
                .isEqualByComparingTo("80.50");
        assertThat(CalculationService.monthlyAmount(new BigDecimal("80.00")))
                .isEqualByComparingTo("80.00");
    }

    @Test
    @DisplayName("A missing TTC amount is rejected with a French message")
    void monthlyAmountRequiresAmount() {
        assertThatThrownBy(() -> CalculationService.monthlyAmount(null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le montant TTC est obligatoire.");
    }

    @Test
    @DisplayName("A negative monthly amount is rejected with a French message")
    void monthlyAmountRejectsNegative() {
        assertThatThrownBy(() -> CalculationService.monthlyAmount(new BigDecimal("-1.00")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le montant TTC ne peut pas être négatif.");
    }

    @Test
    @DisplayName("The pro-rata amount is rounded to the cent with HALF_UP")
    void claimedAmountRounded() {
        assertThat(CalculationService.claimedAmount(new BigDecimal("80.00"), new BigDecimal("35.71")))
                .isEqualByComparingTo("28.57");
        assertThat(CalculationService.claimedAmount(new BigDecimal("10.00"), new BigDecimal("33.33")))
                .isEqualByComparingTo("3.33");
        assertThat(CalculationService.claimedAmount(new BigDecimal("0.01"), new BigDecimal("50.00")))
                .isEqualByComparingTo("0.01");
    }

    @Test
    @DisplayName("The total adds up already rounded lines")
    void totalLinesRounded() {
        assertThat(CalculationService.total(List.of(
                new BigDecimal("28.57"),
                new BigDecimal("41.66"),
                new BigDecimal("294.64")))).isEqualByComparingTo("364.87");
    }

    @Test
    @DisplayName("The pro-rata base equals 25 / 70 = 35.71%")
    void proRataBase() {
        assertThat(CalculationService.proRataBase(new BigDecimal("25"), new BigDecimal("70")))
                .isEqualByComparingTo("35.71");
    }

    @Test
    @DisplayName("Invalid inputs are rejected with a French message")
    void invalidInputs() {
        assertThatThrownBy(() -> CalculationService.claimedAmount(new BigDecimal("10"), new BigDecimal("101")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("prorata");
        assertThatThrownBy(() -> CalculationService.proRataBase(new BigDecimal("80"), new BigDecimal("70")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("surface");
    }

    @Test
    @DisplayName("The TTC amount is the HT amount plus VAT, rounded HALF_UP")
    void grossFromNet() {
        assertThat(CalculationService.grossFromNet(new BigDecimal("41.66"), new BigDecimal("20")))
                .isEqualByComparingTo("49.99");
        assertThat(CalculationService.grossFromNet(new BigDecimal("100"), new BigDecimal("5.5")))
                .isEqualByComparingTo("105.50");
        assertThat(CalculationService.grossFromNet(new BigDecimal("80"), BigDecimal.ZERO))
                .isEqualByComparingTo("80.00");
        assertThat(CalculationService.grossFromNet(new BigDecimal("100"), new BigDecimal("10")))
                .isEqualByComparingTo("110.00");
    }

    @Test
    @DisplayName("A negative HT amount is rejected with a French message")
    void grossFromNetRejectsNegativeNet() {
        assertThatThrownBy(() -> CalculationService.grossFromNet(new BigDecimal("-1.00"), new BigDecimal("20")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("négatif");
    }

    @Test
    @DisplayName("A VAT rate outside 0..100 is rejected with a French message")
    void grossFromNetRejectsInvalidRate() {
        assertThatThrownBy(() -> CalculationService.grossFromNet(new BigDecimal("80"), new BigDecimal("101")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("taux");
        assertThatThrownBy(() -> CalculationService.grossFromNet(null, new BigDecimal("20")))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> CalculationService.grossFromNet(new BigDecimal("80"), null))
                .isInstanceOf(BusinessException.class);
    }
}
