package fr.hkof.homeofficeexpenses.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A local account able to open a session. The e-mail is stored normalized in lower case and
 * the password only as a BCrypt hash; a confirmation token is stored hashed, never in clear.
 */
@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, length = 320, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "confirmed", nullable = false)
    private boolean confirmed;

    @Column(name = "must_change_password", nullable = false)
    private boolean mustChangePassword;

    @Column(name = "confirmation_token_hash", length = 64)
    private String confirmationTokenHash;

    @Column(name = "confirmation_token_expires_at")
    private Instant confirmationTokenExpiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private UserRole role = UserRole.USER;

    @Column(name = "company_enabled", nullable = false)
    private boolean companyEnabled = true;

    @Column(name = "lmnp_enabled", nullable = false)
    private boolean lmnpEnabled = true;

    /** True once the onboarding wizard is completed; migrated accounts start as done. */
    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public boolean isConfirmed() {
        return confirmed;
    }

    public void setConfirmed(boolean confirmed) {
        this.confirmed = confirmed;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    public void setMustChangePassword(boolean mustChangePassword) {
        this.mustChangePassword = mustChangePassword;
    }

    public String getConfirmationTokenHash() {
        return confirmationTokenHash;
    }

    public void setConfirmationTokenHash(String confirmationTokenHash) {
        this.confirmationTokenHash = confirmationTokenHash;
    }

    public Instant getConfirmationTokenExpiresAt() {
        return confirmationTokenExpiresAt;
    }

    public void setConfirmationTokenExpiresAt(Instant confirmationTokenExpiresAt) {
        this.confirmationTokenExpiresAt = confirmationTokenExpiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public boolean isCompanyEnabled() {
        return companyEnabled;
    }

    public void setCompanyEnabled(boolean companyEnabled) {
        this.companyEnabled = companyEnabled;
    }

    public boolean isLmnpEnabled() {
        return lmnpEnabled;
    }

    public void setLmnpEnabled(boolean lmnpEnabled) {
        this.lmnpEnabled = lmnpEnabled;
    }

    public boolean isOnboardingCompleted() {
        return onboardingCompleted;
    }

    public void setOnboardingCompleted(boolean onboardingCompleted) {
        this.onboardingCompleted = onboardingCompleted;
    }
}
