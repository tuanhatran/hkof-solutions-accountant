package fr.hkof.homeofficeexpenses.web.dto;

public final class AgencyDtos {

    private AgencyDtos() {
    }

    public record AgencyRequest(
            String name,
            boolean isPersonal,
            String managerName,
            String legalForm,
            String siren,
            String siret,
            String address) {
    }

    public record AgencyDto(
            Long id,
            String name,
            boolean isPersonal,
            String managerName,
            String legalForm,
            String siren,
            String siret,
            String address) {
    }
}
