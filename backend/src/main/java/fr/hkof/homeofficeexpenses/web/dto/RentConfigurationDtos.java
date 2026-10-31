package fr.hkof.homeofficeexpenses.web.dto;

import java.util.List;

public final class RentConfigurationDtos {

    private RentConfigurationDtos() {
    }

    public record PersonRequest(
            String name,
            String address,
            String issuePlace) {
    }

    public record PersonDto(
            Long id,
            String name,
            String address,
            String issuePlace,
            int signatureCount) {
    }

    public record LeaseRequest(
            Boolean companyLease,
            Long landlordId,
            Long companyId,
            Long tenantId,
            String propertyAddress,
            String rentExclCharges,
            String charges,
            String totalArea,
            String businessArea,
            String companySiren,
            List<Long> tenantIds) {

        public LeaseRequest(Boolean companyLease, Long landlordId, Long companyId, Long tenantId,
                String propertyAddress, String rentExclCharges, String charges, String totalArea,
                String businessArea) {
            this(companyLease, landlordId, companyId, tenantId, propertyAddress, rentExclCharges, charges,
                    totalArea, businessArea, null);
        }

        public LeaseRequest(Boolean companyLease, Long landlordId, Long companyId, Long tenantId,
                String propertyAddress, String rentExclCharges, String charges, String totalArea,
                String businessArea, String companySiren) {
            this(companyLease, landlordId, companyId, tenantId, propertyAddress, rentExclCharges, charges,
                    totalArea, businessArea, companySiren, null);
        }
    }

    public record AddressDto(
            Long id,
            String label) {
    }

    public record LeaseDto(
            Long id,
            Long addressId,
            Long companyId,
            String companyName,
            Boolean companyLease,
            Long landlordId,
            Long tenantId,
            List<Long> tenantIds,
            String landlordName,
            String tenantName,
            String propertyAddress,
            String rentExclCharges,
            String charges,
            String totalArea,
            String businessArea,
            String proRataBase,
            String proRataBaseDetail,
            String companySiren,
            String companyLegalForm,
            String companyAddress,
            String companyManagerName) {
    }
}
