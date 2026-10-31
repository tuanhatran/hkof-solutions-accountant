package fr.hkof.homeofficeexpenses.config;

import java.time.Clock;
import java.time.Instant;

import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.domain.UserRole;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;

/** Creates the documented local accounts: thtran as ADMIN and, under e2e, a regular account. */
@Component
public class SeedUserInitializer {

    private static final String SEED_USER_EMAIL = "thtran@homeofficeexpenses.local";
    private static final String SEED_USER_PASSWORD = "thtran";
    private static final String E2E_USER_EMAIL = "e2e@homeofficeexpenses.local";
    private static final String E2E_USER_PASSWORD = "e2e-password";

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;
    private final Clock clock;

    public SeedUserInitializer(AppUserRepository users, PasswordEncoder passwordEncoder,
            Environment environment, Clock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.environment = environment;
        this.clock = clock;
    }

    public String seedOwnerEmail() {
        return SEED_USER_EMAIL;
    }

    public void initUsers() {
        createUserIfAbsent(SEED_USER_EMAIL, SEED_USER_PASSWORD, true, UserRole.ADMIN);
        if (environment.matchesProfiles("e2e")) {
            createUserIfAbsent(E2E_USER_EMAIL, E2E_USER_PASSWORD, false, UserRole.USER);
        }
    }

    private void createUserIfAbsent(String email, String rawPassword, boolean mustChangePassword, UserRole role) {
        if (users.existsByEmailIgnoreCase(email)) {
            return;
        }
        Instant now = Instant.now(clock);
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setConfirmed(true);
        user.setMustChangePassword(mustChangePassword);
        user.setRole(role);
        user.setCompanyEnabled(true);
        user.setLmnpEnabled(true);
        // Seeded accounts are created after Flyway on a fresh database, so V29 does not backfill
        // them: they already have their data and must never be sent to the onboarding wizard.
        user.setOnboardingCompleted(true);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        users.save(user);
    }
}
