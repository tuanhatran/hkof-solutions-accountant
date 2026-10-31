package fr.hkof.homeofficeexpenses.web.dto;

public final class LandlordDtos {

    private LandlordDtos() {
    }

    public record LandlordRequest(
            String name,
            String address,
            String phone,
            String addressNote,
            String issuePlace) {
    }

    public record LandlordDto(
            Long id,
            String name,
            String address,
            String phone,
            String addressNote,
            String issuePlace,
            int signatureCount) {
    }
}
