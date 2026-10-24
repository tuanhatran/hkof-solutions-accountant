package fr.hkof.homeofficeexpenses.web.dto;

import java.time.Instant;

public final class ExtractionDtos {

    private ExtractionDtos() {
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
}
