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
            Long landlordId,
            String landlordName) {
    }
}
