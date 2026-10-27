package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Pure monetary logic with no Spring dependency. Every authoritative value goes through this class.
 */
public final class CalculationService {

    private CalculationService() {
    }

    public static BigDecimal monthlyAmount(BigDecimal amountInclVat) {
        if (amountInclVat == null) {
            throw new BusinessException("AMOUNT_REQUIRED", "Le montant TTC est obligatoire.");
        }
        if (amountInclVat.signum() < 0) {
            throw new BusinessException("AMOUNT_NEGATIVE", "Le montant TTC ne peut pas être négatif.");
        }
        return amountInclVat.setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal claimedAmount(BigDecimal monthlyAmount, BigDecimal proRataPct) {
        if (monthlyAmount == null || proRataPct == null) {
            throw new BusinessException("AMOUNT_PRO_RATA_REQUIRED",
                    "Le montant du mois et le prorata sont obligatoires.");
        }
        if (proRataPct.signum() < 0 || proRataPct.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BusinessException("PRO_RATA_OUT_OF_RANGE", "Le prorata doit être compris entre 0 et 100 %.");
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
            throw new BusinessException("PRO_RATA_BUSINESS_AREA_OUT_OF_RANGE",
                    "La surface professionnelle doit être comprise entre 0 et la surface totale.");
        }
        return businessArea.multiply(BigDecimal.valueOf(100))
                .divide(totalArea, 2, RoundingMode.HALF_UP);
    }

    public static BigDecimal totalRentReceipt(BigDecimal rentExclCharges, BigDecimal charges) {
        return rentExclCharges.add(charges).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Returns the tax-inclusive amount from a tax-exclusive amount and a VAT rate
     * expressed in percent: {@code net × (1 + vatRatePct / 100)}.
     */
    public static BigDecimal grossFromNet(BigDecimal net, BigDecimal vatRatePct) {
        if (net == null) {
            throw new BusinessException("VAT_NET_AMOUNT_REQUIRED", "Le montant HT est obligatoire.");
        }
        if (net.signum() < 0) {
            throw new BusinessException("VAT_NET_AMOUNT_NEGATIVE", "Le montant HT ne peut pas être négatif.");
        }
        if (vatRatePct == null) {
            throw new BusinessException("VAT_RATE_REQUIRED", "Le taux de TVA est obligatoire.");
        }
        if (vatRatePct.signum() < 0 || vatRatePct.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BusinessException("VAT_RATE_OUT_OF_RANGE",
                    "Le taux de TVA doit être compris entre 0 et 100 %.");
        }
        return net.multiply(BigDecimal.valueOf(100).add(vatRatePct))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }
}
