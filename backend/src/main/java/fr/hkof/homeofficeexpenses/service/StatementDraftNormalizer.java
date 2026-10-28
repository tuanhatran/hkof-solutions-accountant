package fr.hkof.homeofficeexpenses.service;

import java.time.YearMonth;
import java.util.List;
import java.util.Set;

import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.StatementDraftRequest;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.ExpenseLineRequest;

/**
 * Validates and normalises an expense statement draft request before it is stored. Kept out
 * of {@link DocumentDraftService} so both stay small and the transport validation is testable
 * on its own.
 */
final class StatementDraftNormalizer {

    private static final Set<String> AMOUNT_SOURCES = Set.of("MANUAL", "AI");
    private static final Set<String> CONFIDENCES = Set.of("haute", "moyenne", "basse");

    private StatementDraftNormalizer() {
    }

    static StatementDraftRequest normalize(StatementDraftRequest request) {
        if (request == null) {
            throw new BusinessException("DRAFT_REQUIRED", "Le brouillon est obligatoire.");
        }
        if (request.companyId() == null) {
            throw new BusinessException("DRAFT_COMPANY_REQUIRED", "La société du brouillon est obligatoire.");
        }
        YearMonth month = Amounts.month(request.month());
        List<ExpenseLineRequest> lines = request.lines() == null
                ? List.of()
                : request.lines().stream().map(StatementDraftNormalizer::normalizeLine).toList();
        return new StatementDraftRequest(
                request.companyId(),
                month.toString(),
                request.leaseId(),
                request.templateId(),
                request.complete() == null || request.complete(),
                lines);
    }

    private static ExpenseLineRequest normalizeLine(ExpenseLineRequest line) {
        if (line == null) {
            throw new BusinessException("DRAFT_LINE_INVALID", "Une ligne du brouillon est invalide.");
        }
        if (line.itemCode() == null || line.itemCode().isBlank()) {
            throw new BusinessException("DRAFT_LINE_ITEM_REQUIRED", "Le poste d'une ligne du brouillon est obligatoire.");
        }
        String amountSource = line.amountSource();
        if (amountSource != null && !AMOUNT_SOURCES.contains(amountSource)) {
            throw new BusinessException("DRAFT_LINE_SOURCE_INVALID", "L'origine du montant d'une ligne est invalide.");
        }
        String confidence = line.aiConfidence();
        if (confidence != null && !CONFIDENCES.contains(confidence)) {
            throw new BusinessException("DRAFT_LINE_CONFIDENCE_INVALID",
                    "La confiance d'une ligne du brouillon est invalide.");
        }
        return new ExpenseLineRequest(
                line.itemCode().trim(),
                Amounts.decimal(line.amountInclVat(), "montant TTC", false).toPlainString(),
                Amounts.percentage(line.proRataPct()).toPlainString(),
                line.receiptId(),
                amountSource,
                line.aiDetectedAmount(),
                confidence);
    }
}
