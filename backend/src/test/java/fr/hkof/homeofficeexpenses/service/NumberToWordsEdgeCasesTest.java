package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class NumberToWordsEdgeCasesTest {

    @Test
    @DisplayName("Negative amounts are prefixed with moins")
    void negativeAmount() {
        assertThat(NumberToWords.toWords(new BigDecimal("-1.50")))
                .isEqualTo("moins un euro et cinquante centimes");
        assertThat(NumberToWords.toWords(new BigDecimal("-0.01")))
                .isEqualTo("moins zéro euros et un centime");
    }

    @Test
    @DisplayName("Rounds cents HALF_UP before writing them")
    void roundsCents() {
        assertThat(NumberToWords.toWords(new BigDecimal("1.005")))
                .isEqualTo("un euro et un centime");
        assertThat(NumberToWords.toWords(new BigDecimal("1.004")))
                .isEqualTo("un euro");
    }

    @Test
    @DisplayName("Hundreds, thousands, millions and billions are written correctly")
    void largeScales() {
        assertThat(NumberToWords.toWords(new BigDecimal("100.00"))).isEqualTo("cent euros");
        assertThat(NumberToWords.toWords(new BigDecimal("101.00"))).isEqualTo("cent un euros");
        assertThat(NumberToWords.toWords(new BigDecimal("1001.00"))).isEqualTo("mille un euros");
        assertThat(NumberToWords.toWords(new BigDecimal("1.00"))).isEqualTo("un euro");
        assertThat(NumberToWords.toWords(new BigDecimal("1000000.00"))).isEqualTo("un million euros");
        assertThat(NumberToWords.toWords(new BigDecimal("2000000.00"))).isEqualTo("deux millions euros");
        assertThat(NumberToWords.toWords(new BigDecimal("1000000000.00"))).isEqualTo("un milliard euros");
        assertThat(NumberToWords.toWords(new BigDecimal("2000000000.00"))).isEqualTo("deux milliards euros");
    }

    @Test
    @DisplayName("Singular millions and billions do not take an s")
    void singularLargeScales() {
        assertThat(NumberToWords.wholeToWords(1_000_000)).isEqualTo("un million");
        assertThat(NumberToWords.wholeToWords(1_000_000_000)).isEqualTo("un milliard");
    }

    @Test
    @DisplayName("A negative whole number is rejected")
    void negativeWhole() {
        assertThatThrownBy(() -> NumberToWords.wholeToWords(-1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Nombre négatif");
    }

    @Test
    @DisplayName("Eighty thousand and two hundred thousand keep French plural rules")
    void pluralThousands() {
        assertThat(NumberToWords.wholeToWords(80_000)).isEqualTo("quatre-vingt mille");
        assertThat(NumberToWords.wholeToWords(200_000)).isEqualTo("deux cent mille");
        assertThat(NumberToWords.wholeToWords(1_000)).isEqualTo("mille");
    }
}
