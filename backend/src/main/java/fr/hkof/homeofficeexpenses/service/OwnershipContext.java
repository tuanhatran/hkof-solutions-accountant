package fr.hkof.homeofficeexpenses.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import fr.hkof.homeofficeexpenses.repository.AppUserRepository;

/**
 * Single place resolving the account that owns the company tree. An authenticated request
 * uses its principal; without authentication (disabled security, e2e reset, tests) it falls
 * back to the seeded thtran account, never to "all rows".
 */
@Service
public class OwnershipContext {

    static final String SEED_USER_EMAIL = "thtran@homeofficeexpenses.local";

    private final AppUserRepository users;

    public OwnershipContext(AppUserRepository users) {
        this.users = users;
    }

    public Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getPrincipal() instanceof AuthService.AuthenticatedUser user) {
            return user.id();
        }
        return users.findByEmailIgnoreCase(SEED_USER_EMAIL)
                .orElseThrow(() -> new IllegalStateException("Seeded owner account is missing"))
                .getId();
    }
}
