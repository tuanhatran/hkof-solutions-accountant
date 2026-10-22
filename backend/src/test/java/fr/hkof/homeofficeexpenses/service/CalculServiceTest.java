package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CalculServiceTest {

    @Test
    @DisplayName("Ventile une facture de 80 € du 01/09 au 31/10 sur octobre : 31 jours sur 61")
    void ventileSurMois() {
        BigDecimal resultat = CalculService.ventilerSurMois(
                new BigDecimal("80.00"),
                LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 10, 31),
                YearMonth.of(2026, 10));

        assertThat(resultat).isEqualByComparingTo("40.66");
    }

    @Test
    @DisplayName("Ventile 18 jours sur 61 à 23,61 € pour le mois de septembre")
    void ventilePartieDeMois() {
        LocalDate debut = LocalDate.of(2026, 9, 13);
        LocalDate fin = LocalDate.of(2026, 11, 12);
        assertThat(CalculService.ventilerSurMois(new BigDecimal("80.00"), debut, fin, YearMonth.of(2026, 9)))
                .isEqualByComparingTo("23.61");
        assertThat(CalculService.ventilerSurMois(new BigDecimal("80.00"), debut, fin, YearMonth.of(2026, 10)))
                .isEqualByComparingTo("40.66");
    }

    @Test
    @DisplayName("Une période hors du mois demandé donne zéro")
    void periodeHorsMois() {
        BigDecimal resultat = CalculService.ventilerSurMois(
                new BigDecimal("50.00"),
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 31),
                YearMonth.of(2026, 10));
        assertThat(resultat).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("Sans période, le montant du mois est le montant TTC")
    void sansPeriode() {
        assertThat(CalculService.ventilerSurMois(new BigDecimal("80.5"), null, null, YearMonth.of(2026, 10)))
                .isEqualByComparingTo("80.50");
    }

    @Test
    @DisplayName("Le prorata est arrondi au centime en HALF_UP")
    void montantRetenuArrondi() {
        assertThat(CalculService.montantRetenu(new BigDecimal("80.00"), new BigDecimal("35.71")))
                .isEqualByComparingTo("28.57");
        assertThat(CalculService.montantRetenu(new BigDecimal("10.00"), new BigDecimal("33.33")))
                .isEqualByComparingTo("3.33");
        assertThat(CalculService.montantRetenu(new BigDecimal("0.01"), new BigDecimal("50.00")))
                .isEqualByComparingTo("0.01");
    }

    @Test
    @DisplayName("Le total additionne des lignes déjà arrondies")
    void totalLignesArrondies() {
        assertThat(CalculService.total(List.of(
                new BigDecimal("28.57"),
                new BigDecimal("41.66"),
                new BigDecimal("294.64")))).isEqualByComparingTo("364.87");
    }

    @Test
    @DisplayName("La base du prorata vaut 25 / 70 = 35,71 %")
    void baseProrata() {
        assertThat(CalculService.prorataBase(new BigDecimal("25"), new BigDecimal("70")))
                .isEqualByComparingTo("35.71");
    }

    @Test
    @DisplayName("Les entrées invalides sont refusées avec un message français")
    void entreesInvalides() {
        assertThatThrownBy(() -> CalculService.ventilerSurMois(
                new BigDecimal("10"), LocalDate.of(2026, 10, 31), LocalDate.of(2026, 10, 1),
                YearMonth.of(2026, 10)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("fin de période");
        assertThatThrownBy(() -> CalculService.montantRetenu(new BigDecimal("10"), new BigDecimal("101")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("prorata");
        assertThatThrownBy(() -> CalculService.prorataBase(new BigDecimal("80"), new BigDecimal("70")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("surface");
    }
}
