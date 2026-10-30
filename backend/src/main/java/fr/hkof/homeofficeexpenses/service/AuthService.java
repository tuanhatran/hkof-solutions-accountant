package fr.hkof.homeofficeexpenses.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import fr.hkof.homeofficeexpenses.config.AppProperties;
import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.domain.UserRole;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;

/**
 * Registration, confirmation and session credentials. Confirmation tokens are random,
 * single-use, valid for the configured duration and stored only as a SHA-256 hash.
 */
@Service
public class AuthService {

    public static final String EMAIL_ALREADY_USED = "EMAIL_ALREADY_USED";
    public static final String CONFIRMATION_TOKEN_INVALID = "CONFIRMATION_TOKEN_INVALID";
    public static final String INVALID_CREDENTIALS = "INVALID_CREDENTIALS";
    public static final String EMAIL_NOT_CONFIRMED = "EMAIL_NOT_CONFIRMED";
    public static final String PASSWORD_TOO_LONG = "PASSWORD_TOO_LONG";
    public static final String PASSWORD_REQUIRED = "PASSWORD_REQUIRED";
    public static final String INVALID_PASSWORD = "INVALID_PASSWORD";

    public static final Duration DEFAULT_CONFIRMATION_TTL = Duration.ofHours(24);

    private static final int MAX_PASSWORD_LENGTH = 100;
    private static final int TOKEN_BYTES = 32;
    private static final String APP_NAME = "HomeOfficeExpenses";

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AppProperties.Auth properties;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();
    private final String timingHash;

    public AuthService(AppUserRepository users, PasswordEncoder passwordEncoder, EmailService emailService,
            AppProperties.Auth properties, Clock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.properties = properties;
        this.clock = clock;
        this.timingHash = passwordEncoder.encode("timing-only-" + APP_NAME);
    }

    @Transactional
    public void register(String email, String password) {
        String normalized = normalize(email);
        if (users.existsByEmailIgnoreCase(normalized)) {
            throw new BusinessException(EMAIL_ALREADY_USED, "Un compte existe déjà avec cette adresse e-mail.");
        }
        validatePassword(password);
        AppUser user = new AppUser();
        Instant now = Instant.now(clock);
        user.setEmail(normalized);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setConfirmed(false);
        user.setMustChangePassword(false);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        String token = issueConfirmation(user, now);
        users.save(user);
        sendConfirmation(user.getEmail(), token);
    }

    @Transactional
    public void confirmEmail(String token) {
        AppUser user = users.findByConfirmationTokenHash(hashToken(token))
                .orElseThrow(AuthService::invalidToken);
        Instant now = Instant.now(clock);
        Instant expiresAt = user.getConfirmationTokenExpiresAt();
        if (user.isConfirmed() || expiresAt == null || !expiresAt.isAfter(now)) {
            throw invalidToken();
        }
        user.setConfirmed(true);
        user.setConfirmationTokenHash(null);
        user.setConfirmationTokenExpiresAt(null);
        user.setUpdatedAt(now);
        users.save(user);
    }

    @Transactional
    public void resendConfirmation(String email) {
        AppUser user = users.findByEmailIgnoreCase(normalize(email)).orElse(null);
        if (user == null || user.isConfirmed()) {
            return;
        }
        Instant now = Instant.now(clock);
        String token = issueConfirmation(user, now);
        user.setUpdatedAt(now);
        users.save(user);
        sendConfirmation(user.getEmail(), token);
    }

    @Transactional(readOnly = true)
    public AuthenticatedUser login(String email, String password) {
        AppUser user = users.findByEmailIgnoreCase(normalize(email)).orElse(null);
        if (user == null) {
            passwordEncoder.matches(password == null ? "" : password, timingHash);
            throw new InvalidCredentialsException();
        }
        if (!passwordEncoder.matches(password == null ? "" : password, user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        if (!user.isConfirmed()) {
            throw new EmailNotConfirmedException();
        }
        return AuthenticatedUser.from(user);
    }

    @Transactional
    public AuthenticatedUser changePassword(Long userId, String currentPassword, String newPassword) {
        AppUser user = users.findById(userId).orElseThrow(InvalidCredentialsException::new);
        if (!passwordEncoder.matches(currentPassword == null ? "" : currentPassword, user.getPasswordHash())) {
            throw new BusinessException(INVALID_PASSWORD, "Le mot de passe actuel est incorrect.");
        }
        validatePassword(newPassword);
        Instant now = Instant.now(clock);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        user.setUpdatedAt(now);
        users.save(user);
        return AuthenticatedUser.from(user);
    }

    /** Restores the documented seed credentials, used by the e2e reset without deleting accounts. */
    @Transactional
    public void restoreSeedUser(String email, String rawPassword, boolean mustChangePassword) {
        users.findByEmailIgnoreCase(normalize(email)).ifPresent(user -> {
            Instant now = Instant.now(clock);
            user.setPasswordHash(passwordEncoder.encode(rawPassword));
            user.setConfirmed(true);
            user.setMustChangePassword(mustChangePassword);
            user.setConfirmationTokenHash(null);
            user.setConfirmationTokenExpiresAt(null);
            user.setUpdatedAt(now);
            users.save(user);
        });
    }

    private void validatePassword(String password) {
        if (password == null || password.isBlank()) {
            throw new BusinessException(PASSWORD_REQUIRED, "Le mot de passe est obligatoire.");
        }
        if (password.length() > MAX_PASSWORD_LENGTH) {
            throw new BusinessException(PASSWORD_TOO_LONG,
                    "Le mot de passe ne peut pas dépasser 100 caractères.");
        }
    }

    private String issueConfirmation(AppUser user, Instant now) {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        user.setConfirmationTokenHash(hashToken(token));
        Duration ttl = properties.confirmationTtl() == null ? DEFAULT_CONFIRMATION_TTL : properties.confirmationTtl();
        user.setConfirmationTokenExpiresAt(now.plus(ttl));
        return token;
    }

    private void sendConfirmation(String email, String token) {
        String link = UriComponentsBuilder.fromUriString(properties.confirmationUrl())
                .queryParam("token", token)
                .build()
                .toUriString();
        emailService.sendConfirmation(email, link);
    }

    private static RuntimeException invalidToken() {
        return new BusinessException(CONFIRMATION_TOKEN_INVALID,
                "Ce lien de confirmation est invalide ou a expiré.");
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is required", ex);
        }
    }

    /** The authenticated account exposed to the security context. */
    public record AuthenticatedUser(Long id, String email, String password, boolean mustChangePassword,
            UserRole role, boolean companyEnabled, boolean lmnpEnabled) implements UserDetails {

        public static AuthenticatedUser from(AppUser user) {
            return new AuthenticatedUser(user.getId(), user.getEmail(), user.getPasswordHash(),
                    user.isMustChangePassword(), user.getRole(), user.isCompanyEnabled(), user.isLmnpEnabled());
        }

        @Override
        public java.util.Collection<? extends GrantedAuthority> getAuthorities() {
            return java.util.List.of(() -> "ROLE_" + role.name());
        }

        @Override
        public String getPassword() {
            return password;
        }

        @Override
        public String getUsername() {
            return email;
        }

        @Override
        public boolean isAccountNonExpired() {
            return true;
        }

        @Override
        public boolean isAccountNonLocked() {
            return true;
        }

        @Override
        public boolean isCredentialsNonExpired() {
            return true;
        }

        @Override
        public boolean isEnabled() {
            return true;
        }
    }

    /** Thrown when the e-mail or the password does not match an account. */
    public static class InvalidCredentialsException extends RuntimeException {
    }

    /** Thrown when the account exists but its e-mail has not been confirmed yet. */
    public static class EmailNotConfirmedException extends RuntimeException {
    }
}
