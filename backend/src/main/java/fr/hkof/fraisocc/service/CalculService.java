package fr.hkof.fraisocc.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Logique monétaire pure, sans dépendance Spring. Toute valeur qui fait foi
 * passe par cette classe.
 */
public final class CalculService {

    private CalculService() {
    }

    public static BigDecimal ventilerSurMois(BigDecimal montantTtc, LocalDate debut, LocalDate fin, YearMonth mois) {
        if (montantTtc == null) {
            throw new BusinessException("Le montant TTC est obligatoire.");
        }
        if (montantTtc.signum() < 0) {
            throw new BusinessException("Le montant TTC ne peut pas être négatif.");
        }
        if (debut == null && fin == null) {
            return montantTtc.setScale(2, RoundingMode.HALF_UP);
        }
        if (debut == null || fin == null) {
            throw new BusinessException("Les deux dates de période doivent être renseignées, ou aucune.");
        }
        if (fin.isBefore(debut)) {
            throw new BusinessException("La fin de période ne peut pas précéder le début.");
        }
        long joursTotal = ChronoUnit.DAYS.between(debut, fin) + 1;
        LocalDate debutMois = mois.atDay(1);
        LocalDate finMois = mois.atEndOfMonth();
        LocalDate debutInclus = debut.isBefore(debutMois) ? debutMois : debut;
        LocalDate finIncluse = fin.isAfter(finMois) ? finMois : fin;
        long joursDansMois = ChronoUnit.DAYS.between(debutInclus, finIncluse) + 1;
        if (joursDansMois <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return montantTtc.multiply(BigDecimal.valueOf(joursDansMois))
                .divide(BigDecimal.valueOf(joursTotal), 2, RoundingMode.HALF_UP);
    }

    public static BigDecimal montantRetenu(BigDecimal montantMois, BigDecimal prorataPct) {
        if (montantMois == null || prorataPct == null) {
            throw new BusinessException("Le montant du mois et le prorata sont obligatoires.");
        }
        if (prorataPct.signum() < 0 || prorataPct.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BusinessException("Le prorata doit être compris entre 0 et 100 %.");
        }
        return montantMois.multiply(prorataPct)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    public static BigDecimal total(List<BigDecimal> montants) {
        if (montants == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return montants.stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal prorataBase(BigDecimal surfacePro, BigDecimal surfaceTotale) {
        if (surfacePro == null || surfaceTotale == null || surfaceTotale.signum() <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (surfacePro.signum() < 0 || surfacePro.compareTo(surfaceTotale) > 0) {
            throw new BusinessException("La surface professionnelle doit être comprise entre 0 et la surface totale.");
        }
        return surfacePro.multiply(BigDecimal.valueOf(100))
                .divide(surfaceTotale, 2, RoundingMode.HALF_UP);
    }

    public static BigDecimal totalQuittance(BigDecimal loyerHc, BigDecimal charges) {
        return loyerHc.add(charges).setScale(2, RoundingMode.HALF_UP);
    }
}
