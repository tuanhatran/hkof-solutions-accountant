package fr.hkof.homeofficeexpenses.web.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class Dtos {

    private Dtos() {
    }

    public record SettingsDto(
            Long id,
            String companyName,
            String legalForm,
            String siren,
            String companyAddress,
            String managerName,
            String homeAddress,
            String totalArea,
            String businessArea,
            String proRataBase,
            String proRataBaseDetail,
            String landlordName,
            String landlordAddress,
            String tenantName,
            String tenantAddress,
            String rentExclCharges,
            String chargesAdvance,
            String issuePlace) {
    }

    public record SettingsRequest(
            String companyName,
            String legalForm,
            String siren,
            String companyAddress,
            String managerName,
            String homeAddress,
            String totalArea,
            String businessArea,
            String landlordName,
            String landlordAddress,
            String tenantName,
            String tenantAddress,
            String rentExclCharges,
            String chargesAdvance,
            String issuePlace) {
    }

    public record ExpenseItemDto(
            Long id,
            String code,
            String label,
            String supplier,
            String proRataPct,
            String periodicity,
            boolean active,
            int sortOrder,
            boolean multipleLinesAllowed) {
    }

    public record ExpenseItemRequest(
            String code,
            String label,
            String supplier,
            String proRataPct,
            String periodicity,
            Boolean active,
            Integer sortOrder,
            Boolean multipleLinesAllowed) {
    }

    public record RentReceiptRequest(
            String month,
            String periodStart,
            String periodEnd,
            String rentExclCharges,
            String charges,
            String paymentDate,
            String issueDate,
            Long templateId,
            Long signatureId) {
    }

    public record RentReceiptDto(
            Long id,
            String month,
            LocalDate periodStart,
            LocalDate periodEnd,
            String rentExclCharges,
            String charges,
            String total,
            LocalDate paymentDate,
            LocalDate issueDate,
            int version,
            String status,
            Long templateId,
            String templateName,
            Integer templateVersion,
            Instant createdAt,
            boolean pdfAvailable) {
    }

    public record ReceiptDto(
            Long id,
            String fileName,
            String mimeType,
            long size,
            Instant createdAt) {
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

    public record StatementCalculationRequest(String month, List<ExpenseLineRequest> lines) {
    }

    public record StatementGenerationRequest(String month, Long templateId, List<ExpenseLineRequest> lines, Long signatureId) {
    }

    public record StatementPreviewRequest(String month, Long templateId, Boolean complete, List<ExpenseLineRequest> lines, Long signatureId) {
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
            RentReceiptDto rentReceipt,
            List<ExpenseLineDto> lines,
            String proRataBase,
            String proRataBaseDetail,
            List<String> missingItems) {
    }

    public record StatementDto(
            Long id,
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

    public record ExtractionDto(
            String suggestedType,
            String supplier,
            String invoiceNumber,
            String invoiceDate,
            String amountInclVat,
            String amountExclVat,
            String currency,
            String sourceExcerpt,
            String confidence) {
    }

    public record AnalysisDto(
            Long id,
            Long receiptId,
            String fileName,
            String status,
            String model,
            Long durationMs,
            ExtractionDto result,
            String errorMessage,
            Instant createdAt) {
    }

    public record AnalysisStartResponse(Long analysisId, String status) {
    }

    public record LlmConfigDto(
            boolean active,
            String supplier,
            String url,
            String model,
            int timeoutSeconds,
            String temperature,
            int numCtx,
            int maxPages,
            boolean ocrActive,
            String extractionPrompt,
            boolean apiKeyConfigured,
            boolean remoteUrl,
            String warning) {
    }

    public record LlmConfigRequest(
            Boolean active,
            String supplier,
            String url,
            String model,
            Integer timeoutSeconds,
            String temperature,
            Integer numCtx,
            Integer maxPages,
            Boolean ocrActive,
            String extractionPrompt,
            String apiKey) {
    }

    public record LlmModelDto(String name, String family, String parameters, boolean vision) {
    }

    public record DefaultPromptDto(String prompt) {
    }

    public record LlmStatusDto(
            String status,
            boolean active,
            boolean reachable,
            boolean modelAvailable,
            String message) {
    }

    public record LlmTestResponse(
            boolean success,
            long durationMs,
            String message,
            String detectedAmount) {
    }

    public record ValidationReportDto(
            List<String> recognizedVariables,
            List<String> unknownVariables,
            List<String> missingVariables,
            boolean structureValid,
            List<String> errors) {
    }

    public record TemplateDto(
            Long id,
            String type,
            String name,
            int version,
            String format,
            boolean active,
            boolean builtIn,
            Instant createdAt,
            ValidationReportDto report) {
    }

    public record TemplateVariableDto(String name, String description, boolean required, String example) {
    }

    public record SignatureDto(
            Long id,
            String type,
            String name,
            String mimeType,
            Instant createdAt) {
    }
}
