package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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
            new AppProperties.Auth("http://localhost/confirm-email", Duration.ofHours(24)),
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
    @DisplayName("A new account defaults to USER with both modules enabled and onboarding pending")
    void defaultsToRegularUserWithModulesEnabled() {
        AppUser user = new AppUser();

        assertThat(user.getRole()).isEqualTo(UserRole.USER);
        assertThat(user.isCompanyEnabled()).isTrue();
        assertThat(user.isLmnpEnabled()).isTrue();
        assertThat(user.isOnboardingCompleted()).isFalse();
    }

    @Test
    @DisplayName("Completing the onboarding flips the flag once and exposes it on the principal")
    void completesOnboardingOnce() {
        AppUser user = user(UserRole.USER, true, true);
        user.setId(1L);
        when(users.findById(1L)).thenReturn(Optional.of(user));

        AuthenticatedUser first = service.completeOnboarding(1L);

        assertThat(first.onboardingCompleted()).isTrue();
        assertThat(user.isOnboardingCompleted()).isTrue();
        verify(users).save(user);

        clearInvocations(users);
        when(users.findById(1L)).thenReturn(Optional.of(user));
        assertThat(service.completeOnboarding(1L).onboardingCompleted()).isTrue();
        verify(users, never()).save(any(AppUser.class));
    }

    @Test
    @DisplayName("Completing the onboarding of an unknown account fails like a missing principal")
    void onboardingRequiresAnAccount() {
        when(users.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.completeOnboarding(99L))
                .isInstanceOf(AuthService.InvalidCredentialsException.class);
    }

    @Test
    @DisplayName("Registration accepts custom module flags and sets them on the user")
    void registerWithCustomModules() {
        when(users.existsByEmailIgnoreCase("new@example.test")).thenReturn(false);
        when(encoder.encode("secret")).thenReturn("hashed");

        service.register("new@example.test", "secret", false, true);

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(users).save(captor.capture());
        assertThat(captor.getValue().isCompanyEnabled()).isFalse();
        assertThat(captor.getValue().isLmnpEnabled()).isTrue();
    }

    @Test
    @DisplayName("Registration defaults omitted module flags to true")
    void registerDefaultsOmittedModulesToTrue() {
        when(users.existsByEmailIgnoreCase("new2@example.test")).thenReturn(false);
        when(encoder.encode("secret")).thenReturn("hashed");

        service.register("new2@example.test", "secret", null, null);

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(users).save(captor.capture());
        assertThat(captor.getValue().isCompanyEnabled()).isTrue();
        assertThat(captor.getValue().isLmnpEnabled()).isTrue();
    }

    @Test
    @DisplayName("Two-argument registration delegates with both modules enabled")
    void registerTwoArgumentsDefaultsModules() {
        when(users.existsByEmailIgnoreCase("two@example.test")).thenReturn(false);
        when(encoder.encode("secret")).thenReturn("hashed");

        service.register("two@example.test", "secret");

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(users).save(captor.capture());
        assertThat(captor.getValue().isCompanyEnabled()).isTrue();
        assertThat(captor.getValue().isLmnpEnabled()).isTrue();
    }

    @Test
    @DisplayName("Registration rejects when neither module is selected")
    void registerRejectsWhenBothModulesDisabled() {
        assertThatThrownBy(() -> service.register("new@example.test", "secret", false, false))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Au moins un module doit être sélectionné.");
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
