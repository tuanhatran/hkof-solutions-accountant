package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import fr.hkof.homeofficeexpenses.config.AppProperties;
import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.domain.UserRole;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;
import fr.hkof.homeofficeexpenses.service.AuthService.AuthenticatedUser;

class AuthServiceTest {

    private final AppUserRepository users = mock(AppUserRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final AuthService service = new AuthService(users, encoder, mock(EmailService.class),
            new AppProperties.Auth("http://localhost/confirmer-email", Duration.ofHours(24)),
            Clock.systemUTC());

    @Test
    @DisplayName("The authenticated principal carries the role, module flags and matching authority")
    void exposesRoleAndModulesOnLogin() {
        AppUser admin = user(UserRole.ADMIN, false, true);
        when(users.findByEmailIgnoreCase("admin@example.test")).thenReturn(Optional.of(admin));
        when(encoder.matches("secret", "hash")).thenReturn(true);

        AuthenticatedUser principal = service.login("admin@example.test", "secret");

        assertThat(principal.role()).isEqualTo(UserRole.ADMIN);
        assertThat(principal.companyEnabled()).isFalse();
        assertThat(principal.lmnpEnabled()).isTrue();
        assertThat(principal.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_ADMIN");
    }

    @Test
    @DisplayName("A regular account keeps ROLE_USER authority")
    void exposesUserAuthority() {
        AppUser user = user(UserRole.USER, true, true);
        when(users.findByEmailIgnoreCase("user@example.test")).thenReturn(Optional.of(user));
        when(encoder.matches("secret", "hash")).thenReturn(true);

        AuthenticatedUser principal = service.login("USER@example.test", "secret");

        assertThat(principal.role()).isEqualTo(UserRole.USER);
        assertThat(principal.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_USER");
    }

    @Test
    @DisplayName("A new account defaults to USER with both modules enabled")
    void defaultsToRegularUserWithModulesEnabled() {
        AppUser user = new AppUser();

        assertThat(user.getRole()).isEqualTo(UserRole.USER);
        assertThat(user.isCompanyEnabled()).isTrue();
        assertThat(user.isLmnpEnabled()).isTrue();
    }

    private static AppUser user(UserRole role, boolean companyEnabled, boolean lmnpEnabled) {
        AppUser user = new AppUser();
        user.setEmail("someone@example.test");
        user.setPasswordHash("hash");
        user.setConfirmed(true);
        user.setRole(role);
        user.setCompanyEnabled(companyEnabled);
        user.setLmnpEnabled(lmnpEnabled);
        return user;
    }
}
