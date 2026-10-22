package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CalculationServiceTest {

    @Test
    @DisplayName("Allocates an €80 invoice from 01/09 to 31/10 to October: 31 days out of 61")
    void allocatesToMonth() {
        BigDecimal result = CalculationService.allocateToMonth(
                new BigDecimal("80.00"),
                LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 10, 31),
                YearMonth.of(2026, 10));

        assertThat(result).isEqualByComparingTo("40.66");
    }

    @Test
    @DisplayName("Allocates 18 days out of 61 to €23.61 for September")
    void allocatesPartialMonth() {
        LocalDate periodStart = LocalDate.of(2026, 9, 13);
        LocalDate periodEnd = LocalDate.of(2026, 11, 12);
        assertThat(CalculationService.allocateToMonth(new BigDecimal("80.00"), periodStart, periodEnd, YearMonth.of(2026, 9)))
                .isEqualByComparingTo("23.61");
        assertThat(CalculationService.allocateToMonth(new BigDecimal("80.00"), periodStart, periodEnd, YearMonth.of(2026, 10)))
                .isEqualByComparingTo("40.66");
    }

    @Test
    @DisplayName("A period outside the requested month yields zero")
    void periodOutsideMonth() {
        BigDecimal result = CalculationService.allocateToMonth(
                new BigDecimal("50.00"),
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 31),
                YearMonth.of(2026, 10));
        assertThat(result).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("Without a period, the monthly amount is the amount including VAT")
    void withoutPeriod() {
        assertThat(CalculationService.allocateToMonth(new BigDecimal("80.5"), null, null, YearMonth.of(2026, 10)))
                .isEqualByComparingTo("80.50");
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
        assertThatThrownBy(() -> CalculationService.allocateToMonth(
                new BigDecimal("10"), LocalDate.of(2026, 10, 31), LocalDate.of(2026, 10, 1),
                YearMonth.of(2026, 10)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("fin de période");
        assertThatThrownBy(() -> CalculationService.claimedAmount(new BigDecimal("10"), new BigDecimal("101")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("prorata");
        assertThatThrownBy(() -> CalculationService.proRataBase(new BigDecimal("80"), new BigDecimal("70")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("surface");
    }
}
