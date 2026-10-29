package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import fr.hkof.homeofficeexpenses.config.AppProperties;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;
import java.time.Clock;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServicePasswordTest {

    private final AppUserRepository users = mock(AppUserRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final AuthService service = new AuthService(users, encoder, mock(EmailService.class),
            new AppProperties.Auth("http://localhost/confirmer-email", java.time.Duration.ofHours(24)), Clock.systemUTC());

    @Test
    @DisplayName("The service rejects a blank password with PASSWORD_REQUIRED")
    void rejectsBlankPassword() {
        when(users.existsByEmailIgnoreCase("a@example.test")).thenReturn(false);

        assertThatThrownBy(() -> service.register("a@example.test", "   "))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", AuthService.PASSWORD_REQUIRED);
        assertThatThrownBy(() -> service.register("a@example.test", null))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", AuthService.PASSWORD_REQUIRED);
    }

    @Test
    @DisplayName("The service rejects a password over 100 characters with PASSWORD_TOO_LONG")
    void rejectsTooLongPassword() {
        when(users.existsByEmailIgnoreCase("a@example.test")).thenReturn(false);

        assertThatThrownBy(() -> service.register("a@example.test", "x".repeat(101)))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", AuthService.PASSWORD_TOO_LONG);
    }
}
