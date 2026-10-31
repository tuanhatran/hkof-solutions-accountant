package fr.hkof.homeofficeexpenses.web.dto;

import java.time.Instant;

public final class SignatureDtos {

    private SignatureDtos() {
    }

    public record SignatureDto(
            Long id,
            Long personId,
            String personName,
            String name,
            String mimeType,
            Instant createdAt) {
    }

    public record RenameSignatureRequest(String name) {
    }
}
