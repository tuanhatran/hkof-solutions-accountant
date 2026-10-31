package fr.hkof.homeofficeexpenses.web.dto;

import fr.hkof.homeofficeexpenses.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    private static final String EMAIL_REQUIRED = "L'adresse e-mail est obligatoire.";
    private static final String EMAIL_INVALID = "L'adresse e-mail est invalide.";
    private static final String PASSWORD_REQUIRED = "Le mot de passe est obligatoire.";
    private static final String PASSWORD_SIZE = "Le mot de passe ne peut pas dépasser 100 caractères.";

    public record RegisterRequest(
            @NotBlank(message = EMAIL_REQUIRED) @Email(message = EMAIL_INVALID) @Size(max = 320) String email,
            @NotBlank(message = PASSWORD_REQUIRED) @Size(max = 100,
                    message = PASSWORD_SIZE) String password,
            Boolean companyEnabled,
            Boolean lmnpEnabled) {
    }

    public record ConfirmEmailRequest(
            @NotBlank(message = "Le jeton de confirmation est obligatoire.") String token) {
    }

    public record ResendConfirmationRequest(
            @NotBlank(message = EMAIL_REQUIRED) @Email(message = EMAIL_INVALID) @Size(max = 320) String email) {
    }

    public record LoginRequest(
            @NotBlank(message = EMAIL_REQUIRED) @Email(message = EMAIL_INVALID) @Size(max = 320) String email,
            @NotBlank(message = PASSWORD_REQUIRED) String password) {
    }

    public record ChangePasswordRequest(
            @NotBlank(message = "Le mot de passe actuel est obligatoire.") String currentPassword,
            @NotBlank(message = PASSWORD_REQUIRED) @Size(max = 100,
                    message = PASSWORD_SIZE) String newPassword) {
    }

    public record CurrentUserDto(String email, boolean mustChangePassword, UserRole role,
            boolean companyEnabled, boolean lmnpEnabled, boolean onboardingCompleted) {
    }
}
