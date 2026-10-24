package fr.hkof.homeofficeexpenses.web.dto;

import java.time.Instant;
import java.time.LocalDate;

public final class RentReceiptDtos {

    private RentReceiptDtos() {
    }

    public record RentReceiptRequest(
            String month,
            Long landlordId,
            Long tenantId,
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
            Long landlordId,
            Long tenantId,
            String landlordName,
            String tenantName,
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
}
