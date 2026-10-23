package fr.hkof.homeofficeexpenses.service.llm;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TotalAmountResolverTest {

    @Test
    @DisplayName("Resolves the TTC from a layout line holding HT and TTC")
    void resolvesLayoutPair() {
        String text = """
                Fibre Exemple
                n° de facture : 123456789
                total auprès du fournisseur 41,66 49,99
                TVA 20,00 %
                """;

        TotalAmountResolver.Resolution resolution = TotalAmountResolver.resolve(text);

        assertThat(resolution).isNotNull();
        assertThat(resolution.ttc()).isEqualTo("49.99");
        assertThat(resolution.ht()).isEqualTo("41.66");
        assertThat(resolution.excerpt()).contains("total auprès du fournisseur");
    }

    @Test
    @DisplayName("Resolves a 10 % pair")
    void resolvesTenPercentPair() {
        TotalAmountResolver.Resolution resolution = TotalAmountResolver.resolve("total TTC 110,00 100,00");

        assertThat(resolution).isNotNull();
        assertThat(resolution.ttc()).isEqualTo("110.00");
        assertThat(resolution.ht()).isEqualTo("100.00");
    }

    @Test
    @DisplayName("Resolves a 5.5 % pair")
    void resolvesFivePointFivePercentPair() {
        TotalAmountResolver.Resolution resolution = TotalAmountResolver.resolve("Montant total 105,50 100,00");

        assertThat(resolution).isNotNull();
        assertThat(resolution.ttc()).isEqualTo("105.50");
        assertThat(resolution.ht()).isEqualTo("100.00");
    }

    @Test
    @DisplayName("Two different HT/rate pairs producing the same TTC are ambiguous")
    void sameTtcFromDifferentHtIsAmbiguous() {
        String text = """
                total à payer 41,66 49,99
                total à payer 47,38 49,99
                """;

        assertThat(TotalAmountResolver.resolve(text)).isNull();
    }

    @Test
    @DisplayName("The same pair repeated on several lines stays a single candidate")
    void repeatedIdenticalPairIsResolved() {
        String text = """
                total à payer 41,66 49,99
                total à payer 41,66 49,99
                """;

        TotalAmountResolver.Resolution resolution = TotalAmountResolver.resolve(text);

        assertThat(resolution).isNotNull();
        assertThat(resolution.ttc()).isEqualTo("49.99");
        assertThat(resolution.ht()).isEqualTo("41.66");
    }

    @Test
    @DisplayName("Two total lines giving different TTC values are ambiguous")
    void ambiguousPairsReturnNull() {
        String text = """
                total TTC 110,00 100,00
                total TTC 120,00 100,00
                """;

        assertThat(TotalAmountResolver.resolve(text)).isNull();
    }

    @Test
    @DisplayName("An HT-only total line is not a TTC candidate")
    void totalHtLineReturnsNull() {
        assertThat(TotalAmountResolver.resolve("total HT 41,66")).isNull();
        assertThat(TotalAmountResolver.resolve("total hors taxe 41,66 49,99")).isNull();
    }

    @Test
    @DisplayName("A document without a total line has no candidate")
    void noTotalLineReturnsNull() {
        String text = """
                EDF - Facture de gaz
                Montant HT : 65,00 EUR
                Montant TTC : 78,00 EUR
                """;

        assertThat(TotalAmountResolver.resolve(text)).isNull();
        assertThat(TotalAmountResolver.resolve(null)).isNull();
        assertThat(TotalAmountResolver.resolve("")).isNull();
    }

    @Test
    @DisplayName("A single labelled total amount is a candidate without HT")
    void singleLabelledAmount() {
        TotalAmountResolver.Resolution resolution = TotalAmountResolver.resolve("TOTAL À PAYER 49,99");

        assertThat(resolution).isNotNull();
        assertThat(resolution.ttc()).isEqualTo("49.99");
        assertThat(resolution.ht()).isNull();
        assertThat(resolution.excerpt()).contains("TOTAL À PAYER");
    }

    @Test
    @DisplayName("Two different single total amounts are ambiguous")
    void ambiguousSingleAmountsReturnNull() {
        String text = """
                total à payer 49,99
                net à payer 51,00
                """;

        assertThat(TotalAmountResolver.resolve(text)).isNull();
    }

    @Test
    @DisplayName("Thousands separators are normalized")
    void thousandsNormalized() {
        TotalAmountResolver.Resolution resolution = TotalAmountResolver.resolve("montant total 1 234,56");

        assertThat(resolution).isNotNull();
        assertThat(resolution.ttc()).isEqualTo("1234.56");
    }

    @Test
    @DisplayName("The excerpt is capped at 500 characters")
    void excerptCapped() {
        String line = "total à payer " + "x".repeat(600) + " 49,99";
        TotalAmountResolver.Resolution resolution = TotalAmountResolver.resolve(line);

        assertThat(resolution).isNotNull();
        assertThat(resolution.excerpt()).hasSize(500);
    }
}
