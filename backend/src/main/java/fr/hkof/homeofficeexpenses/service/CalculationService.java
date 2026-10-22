package fr.hkof.homeofficeexpenses.service;

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
public final class CalculationService {

    private CalculationService() {
    }

    public static BigDecimal allocateToMonth(BigDecimal amountInclVat, LocalDate debut, LocalDate fin, YearMonth month) {
        if (amountInclVat == null) {
            throw new BusinessException("Le montant TTC est obligatoire.");
        }
        if (amountInclVat.signum() < 0) {
            throw new BusinessException("Le montant TTC ne peut pas être négatif.");
        }
        if (debut == null && fin == null) {
            return amountInclVat.setScale(2, RoundingMode.HALF_UP);
        }
        if (debut == null || fin == null) {
            throw new BusinessException("Les deux dates de période doivent être renseignées, ou aucune.");
        }
        if (fin.isBefore(debut)) {
            throw new BusinessException("La fin de période ne peut pas précéder le début.");
        }
        long joursTotal = ChronoUnit.DAYS.between(debut, fin) + 1;
        LocalDate debutMonth = month.atDay(1);
        LocalDate finMonth = month.atEndOfMonth();
        LocalDate debutInclus = debut.isBefore(debutMonth) ? debutMonth : debut;
        LocalDate finIncluse = fin.isAfter(finMonth) ? finMonth : fin;
        long joursDansMonth = ChronoUnit.DAYS.between(debutInclus, finIncluse) + 1;
        if (joursDansMonth <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return amountInclVat.multiply(BigDecimal.valueOf(joursDansMonth))
                .divide(BigDecimal.valueOf(joursTotal), 2, RoundingMode.HALF_UP);
    }

    public static BigDecimal claimedAmount(BigDecimal monthlyAmount, BigDecimal proRataPct) {
        if (monthlyAmount == null || proRataPct == null) {
            throw new BusinessException("Le montant du mois et le prorata sont obligatoires.");
        }
        if (proRataPct.signum() < 0 || proRataPct.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BusinessException("Le prorata doit être compris entre 0 et 100 %.");
        }
        return monthlyAmount.multiply(proRataPct)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    public static BigDecimal total(List<BigDecimal> amounts) {
        if (amounts == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return amounts.stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal proRataBase(BigDecimal businessArea, BigDecimal totalArea) {
        if (businessArea == null || totalArea == null || totalArea.signum() <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (businessArea.signum() < 0 || businessArea.compareTo(totalArea) > 0) {
            throw new BusinessException("La surface professionnelle doit être comprise entre 0 et la surface totale.");
        }
        return businessArea.multiply(BigDecimal.valueOf(100))
                .divide(totalArea, 2, RoundingMode.HALF_UP);
    }

    public static BigDecimal totalRentReceipt(BigDecimal rentExclCharges, BigDecimal charges) {
        return rentExclCharges.add(charges).setScale(2, RoundingMode.HALF_UP);
    }
}
