package fr.hkof.homeofficeexpenses.web.dto;

import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.domain.UserRole;
import jakarta.validation.constraints.NotNull;

public final class AdminUserDtos {

    private AdminUserDtos() {
    }

    public record AdminUserDto(Long id, String email, UserRole role, boolean companyEnabled,
            boolean lmnpEnabled) {

        public static AdminUserDto from(AppUser user) {
            return new AdminUserDto(user.getId(), user.getEmail(), user.getRole(),
                    user.isCompanyEnabled(), user.isLmnpEnabled());
        }
    }

    public record ModuleFlagsRequest(Boolean companyEnabled, Boolean lmnpEnabled) {
    }

    public record RoleRequest(@NotNull(message = "Le rôle est obligatoire.") UserRole role) {
    }
}
