package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;

import fr.hkof.homeofficeexpenses.domain.AmountSource;
import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.Receipt;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.ExpenseLineDto;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.ExpenseLineRequest;

/**
 * Computes expense statement lines and maps them to the API representation. Every amount
 * goes through {@link CalculationService}; this class never performs its own arithmetic.
 */
@Service
public class ExpenseStatementLineCalculator {

    private static final List<String> CONFIDENCE_LEVELS = List.of("haute", "moyenne", "basse");

    private final ExpenseItemService expenseItemService;
    private final ReceiptService receiptService;

    public ExpenseStatementLineCalculator(ExpenseItemService expenseItemService, ReceiptService receiptService) {
        this.expenseItemService = expenseItemService;
        this.receiptService = receiptService;
    }

    public List<CalculatedLine> calculateLines(Long companyId, List<ExpenseLineRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return List.of();
        }
        List<CalculatedLine> calculatedLines = new ArrayList<>();
        Set<String> codes = new HashSet<>();
        for (ExpenseLineRequest request : requests) {
            if (request.itemCode() == null || request.itemCode().isBlank()) {
                throw new BusinessException("Le type de frais est obligatoire.");
            }
            ExpenseItem expenseItem = expenseItemService.entity(companyId, request.itemCode());
            if (!expenseItem.isMultipleLinesAllowed() && !codes.add(expenseItem.getCode())) {
                throw new BusinessException("Le type « " + expenseItem.getLabel() + " » ne peut être ajouté qu'une fois.");
            }
            BigDecimal amountInclVat = Amounts.decimal(request.amountInclVat(), "montant TTC", true);
            BigDecimal proRataPct = Amounts.percentage(request.proRataPct());
            BigDecimal monthlyAmount = CalculationService.monthlyAmount(amountInclVat);
            BigDecimal claimedAmount = CalculationService.claimedAmount(monthlyAmount, proRataPct);
            Receipt receipt = request.receiptId() == null
                    ? null
                    : receiptService.entity(request.receiptId());
            AmountSource source = amountSource(request.amountSource());
            BigDecimal detectedAmount = Amounts.optionalDecimal(request.aiDetectedAmount(), "montant détecté par IA");
            String confidence = confidence(request.aiConfidence());
            calculatedLines.add(new CalculatedLine(expenseItem, amountInclVat, monthlyAmount, proRataPct, claimedAmount,
                    receipt, source, detectedAmount, confidence));
        }
        // The configured display order is authoritative, stable for equal sortOrder
        // and for a repeated item. Amounts stay attached to their own line.
        calculatedLines.sort(Comparator.comparingInt(line -> line.expenseItem().getSortOrder()));
        return calculatedLines;
    }

    public ExpenseLineDto toDto(CalculatedLine line) {
        return new ExpenseLineDto(
                null,
                line.expenseItem().getCode(),
                line.expenseItem().getLabel(),
                line.expenseItem().getSupplier(),
                Amounts.apiValue(line.amountInclVat()),
                Amounts.apiValue(line.monthlyAmount()),
                Amounts.apiValue(line.proRataPct()),
                Amounts.apiValue(line.claimedAmount()),
                line.receipt() == null ? null : line.receipt().getId(),
                line.receipt() == null ? null : line.receipt().getFileName(),
                line.source().name(),
                Amounts.apiValue(line.detectedAmount()),
                line.confidence());
    }

    private AmountSource amountSource(String value) {
        if (value == null || value.isBlank()) {
            return AmountSource.MANUAL;
        }
        try {
            return AmountSource.valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Source de montant invalide : " + value);
        }
    }

    private String confidence(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalizedConfidence = value.trim().toLowerCase(Locale.ROOT);
        if (!CONFIDENCE_LEVELS.contains(normalizedConfidence)) {
            throw new BusinessException("Niveau de confiance IA invalide : " + value);
        }
        return normalizedConfidence;
    }
}
