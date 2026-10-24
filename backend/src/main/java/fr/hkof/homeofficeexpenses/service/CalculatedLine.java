package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;

import fr.hkof.homeofficeexpenses.domain.AmountSource;
import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.Receipt;

/**
 * A statement line computed from a request, before it is persisted. Shared by the line
 * calculator, the document collaborator and the facade.
 */
record CalculatedLine(
        ExpenseItem expenseItem,
        BigDecimal amountInclVat,
        BigDecimal monthlyAmount,
        BigDecimal proRataPct,
        BigDecimal claimedAmount,
        Receipt receipt,
        AmountSource source,
        BigDecimal detectedAmount,
        String confidence) {
}
