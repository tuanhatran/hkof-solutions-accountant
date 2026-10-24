package fr.hkof.homeofficeexpenses.web.dto;

import java.time.Instant;
import java.util.List;

public final class StatementDtos {

    private StatementDtos() {
    }

    public record ExpenseLineRequest(
            String itemCode,
            String amountInclVat,
            String proRataPct,
            Long receiptId,
            String amountSource,
            String aiDetectedAmount,
            String aiConfidence) {
    }

    public record ExpenseLineDto(
            Long id,
            String itemCode,
            String itemLabel,
            String supplier,
            String amountInclVat,
            String monthlyAmount,
            String proRataPct,
            String claimedAmount,
            Long receiptId,
            String receiptName,
            String amountSource,
            String aiDetectedAmount,
            String aiConfidence) {
    }

    public record StatementCalculationRequest(Long companyId, String month, List<ExpenseLineRequest> lines) {
    }

    public record StatementGenerationRequest(Long companyId, String month, Long templateId,
            List<ExpenseLineRequest> lines, Long signatureId) {
    }

    public record StatementPreviewRequest(Long companyId, String month, Long templateId, Boolean complete,
            List<ExpenseLineRequest> lines, Long signatureId) {
    }

    public record CalculationResponse(
            List<ExpenseLineDto> lines,
            String total,
            String totalInWords,
            String proRataBase,
            String proRataBaseDetail) {
    }

    public record DraftDto(
            String month,
            RentReceiptDtos.RentReceiptDto rentReceipt,
            List<ExpenseLineDto> lines,
            String proRataBase,
            String proRataBaseDetail,
            List<String> missingItems) {
    }

    public record StatementDto(
            Long id,
            Long companyId,
            String companyName,
            String month,
            String number,
            String total,
            int version,
            String status,
            Long templateId,
            String templateName,
            Integer templateVersion,
            Instant createdAt,
            List<ExpenseLineDto> lines,
            boolean pdfAvailable,
            boolean fullPdfAvailable) {
    }
}
