package fr.hkof.homeofficeexpenses.web.dto;

public final class CompanyDtos {

    private CompanyDtos() {
    }

    public record CompanyRequest(
            String name,
            String legalForm,
            String siren,
            String address,
            String managerName,
            String homeAddress,
            String totalArea,
            String businessArea,
            String issuePlace) {
    }

    public record CompanyDto(
            Long id,
            String name,
            String legalForm,
            String siren,
            String address,
            String managerName,
            String homeAddress,
            String totalArea,
            String businessArea,
            String proRataBase,
            String proRataBaseDetail,
            String issuePlace) {
    }
}
