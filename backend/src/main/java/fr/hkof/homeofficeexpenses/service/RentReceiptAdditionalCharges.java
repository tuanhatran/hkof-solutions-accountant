package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import fr.hkof.homeofficeexpenses.domain.RentReceiptAdditionalCharge;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.AdditionalCharge;

/**
 * Normalises and validates the free additional charges of a rent receipt. Shared by the
 * generation request and the persisted draft so both accept exactly the same rows:
 * label required and 120 characters maximum, amount strictly positive, 20 rows maximum.
 */
public final class RentReceiptAdditionalCharges {

    public static final int MAX_LINES = 20;
    private static final int MAX_LABEL_LENGTH = 120;
    private static final String AMOUNT_FIELD = "montant de la charge supplémentaire";

    private RentReceiptAdditionalCharges() {
    }

    public static List<AdditionalCharge> normalize(List<AdditionalCharge> charges) {
        if (charges == null || charges.isEmpty()) {
            return List.of();
        }
        if (charges.size() > MAX_LINES) {
            throw new BusinessException("RENT_RECEIPT_ADDITIONAL_CHARGE_LIMIT",
                    "Une quittance accepte au maximum 20 charges supplémentaires.");
        }
        List<AdditionalCharge> normalized = new ArrayList<>(charges.size());
        for (AdditionalCharge charge : charges) {
            if (charge == null) {
                throw new BusinessException("RENT_RECEIPT_ADDITIONAL_CHARGE_INVALID",
                        "Une charge supplémentaire est invalide.");
            }
            String label = charge.label() == null ? "" : charge.label().trim();
            if (label.isEmpty()) {
                throw new BusinessException("RENT_RECEIPT_ADDITIONAL_CHARGE_LABEL_REQUIRED",
                        "Le libellé d'une charge supplémentaire est obligatoire.");
            }
            if (label.length() > MAX_LABEL_LENGTH) {
                throw new BusinessException("RENT_RECEIPT_ADDITIONAL_CHARGE_LABEL_TOO_LONG",
                        "Le libellé d'une charge supplémentaire ne peut pas dépasser 120 caractères.");
            }
            BigDecimal amount = Amounts.decimal(charge.amount(), AMOUNT_FIELD, true);
            normalized.add(new AdditionalCharge(label, amount.toPlainString()));
        }
        return List.copyOf(normalized);
    }

    public static List<BigDecimal> amounts(List<AdditionalCharge> charges) {
        return charges.stream().map(charge -> new BigDecimal(charge.amount())).toList();
    }

    public static List<RentReceiptAdditionalCharge> entities(List<AdditionalCharge> charges) {
        List<RentReceiptAdditionalCharge> rows = new ArrayList<>(charges.size());
        for (int position = 0; position < charges.size(); position++) {
            AdditionalCharge charge = charges.get(position);
            RentReceiptAdditionalCharge row = new RentReceiptAdditionalCharge();
            row.setLabel(charge.label());
            row.setAmount(new BigDecimal(charge.amount()));
            row.setPosition(position);
            rows.add(row);
        }
        return rows;
    }
}
