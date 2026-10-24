package fr.hkof.homeofficeexpenses.web.dto;

public final class SettingsDtos {

    private SettingsDtos() {
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
            String issuePlace) {
    }
}
