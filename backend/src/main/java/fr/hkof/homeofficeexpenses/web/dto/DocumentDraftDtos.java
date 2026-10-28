package fr.hkof.homeofficeexpenses.web.dto;

import java.time.Instant;
import java.util.List;

import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.ExpenseLineRequest;

/**
 * Transport shapes of the persisted form drafts. Distinct from the compute-only
 * {@code StatementDtos.DraftDto}, which builds a proposed statement from existing data.
 */
public final class DocumentDraftDtos {

    private DocumentDraftDtos() {
    }

    public record RentReceiptDraftRequest(
            String month,
            Long landlordId,
            Long tenantId,
            Long tenantCompanyId,
            String periodStart,
            String periodEnd,
            String rentExclCharges,
            String charges,
            String paymentDate,
            String issueDate,
            Long templateId) {
    }

    public record RentReceiptDraftDto(
            Long id,
            String month,
            Long landlordId,
            Long tenantId,
            Long tenantCompanyId,
            String periodStart,
            String periodEnd,
            String rentExclCharges,
            String charges,
            String paymentDate,
            String issueDate,
            Long templateId,
            Instant savedAt) {
    }

    public record StatementDraftRequest(
            Long companyId,
            String month,
            Long templateId,
            Boolean complete,
            List<ExpenseLineRequest> lines) {
    }

    public record StatementDraftDto(
            Long id,
            Long companyId,
            String month,
            Long templateId,
            boolean complete,
            List<ExpenseLineRequest> lines,
            Instant savedAt) {
    }
}
