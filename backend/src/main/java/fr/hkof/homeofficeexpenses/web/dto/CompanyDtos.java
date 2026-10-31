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
            String issuePlace,
            String siret) {

        public CompanyRequest(String name, String legalForm, String siren, String address, String managerName,
                Long leaseId, String issuePlace) {
            this(name, legalForm, siren, address, managerName, leaseId, issuePlace, null);
        }
    }

    public record CompanyDto(
            Long id,
            String name,
            String legalForm,
            String siren,
            String siret,
            String address,
            String managerName,
            Long leaseId,
            String proRataBase,
            String proRataBaseDetail,
            String issuePlace) {

        public CompanyDto(Long id, String name, String legalForm, String siren, String address, String managerName,
                Long leaseId, String proRataBase, String proRataBaseDetail, String issuePlace) {
            this(id, name, legalForm, siren, null, address, managerName, leaseId, proRataBase, proRataBaseDetail,
                    issuePlace);
        }
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
