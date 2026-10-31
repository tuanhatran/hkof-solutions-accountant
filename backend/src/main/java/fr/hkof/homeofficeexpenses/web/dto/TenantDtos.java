package fr.hkof.homeofficeexpenses.web.dto;

public final class TenantDtos {

    private TenantDtos() {
    }

    public record TenantRequest(
            String name,
            String address,
            String phone,
            String email,
            String addressNote) {
    }

    public record TenantDto(
            Long id,
            String name,
            String address,
            String phone,
            String email,
            String addressNote) {
    }
}
