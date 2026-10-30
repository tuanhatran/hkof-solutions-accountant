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
            Long leaseId,
            String issuePlace) {
    }

    public record CompanyDto(
            Long id,
            String name,
            String legalForm,
            String siren,
            String address,
            String managerName,
            Long leaseId,
            String proRataBase,
            String proRataBaseDetail,
            String issuePlace) {
    }

    /** Public legal identity of a company, safe to expose across accounts. */
    public record CompanyLookupDto(
            String name,
            String siren,
            String legalForm,
            String address,
            String managerName) {
    }
}
