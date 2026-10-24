package fr.hkof.homeofficeexpenses.web.dto;

import java.time.Instant;

public final class SignatureDtos {

    private SignatureDtos() {
    }

    public record SignatureDto(
            Long id,
            String type,
            String name,
            String mimeType,
            Instant createdAt,
            Long companyId,
            String companyName,
            Long employeeId,
            String employeeName,
            Long landlordId,
            String landlordName) {
    }
}
