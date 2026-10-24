package fr.hkof.homeofficeexpenses.web.dto;

public final class RentConfigurationDtos {

    private RentConfigurationDtos() {
    }

    public record LandlordRequest(
            String name,
            String address) {
    }

    public record LandlordDto(
            Long id,
            String name,
            String address) {
    }

    public record TenantRequest(
            String name,
            String address) {
    }

    public record TenantDto(
            Long id,
            String name,
            String address) {
    }

    public record LeaseRequest(
            Long companyId,
            Long landlordId,
            Long tenantId,
            String propertyAddress,
            String rentExclCharges,
            String charges) {
    }

    public record LeaseDto(
            Long id,
            Long companyId,
            String companyName,
            Long landlordId,
            Long tenantId,
            String landlordName,
            String tenantName,
            String propertyAddress,
            String rentExclCharges,
            String charges) {
    }
}
