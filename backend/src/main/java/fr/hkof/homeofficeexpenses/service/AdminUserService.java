package fr.hkof.homeofficeexpenses.service;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.domain.UserRole;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;
import fr.hkof.homeofficeexpenses.web.dto.AdminUserDtos.AdminUserDto;

/**
 * Reads and updates the accounts exposed on the admin user screen: role and module flags.
 * A missing account answers USER_NOT_FOUND, never a silent no-op.
 */
@Service
public class AdminUserService {

    public static final String USER_NOT_FOUND = "USER_NOT_FOUND";
    public static final String MODULES_REQUIRED = "MODULES_REQUIRED";

    private final AppUserRepository users;

    public AdminUserService(AppUserRepository users) {
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<AdminUserDto> listUsers() {
        return users.findAll(Sort.by("id")).stream().map(AdminUserDto::from).toList();
    }

    @Transactional
    public AdminUserDto updateModules(Long id, Boolean companyEnabled, Boolean lmnpEnabled) {
        if (companyEnabled == null && lmnpEnabled == null) {
            throw new BusinessException(MODULES_REQUIRED, "Au moins un module doit être précisé.");
        }
        AppUser user = require(id);
        if (companyEnabled != null) {
            user.setCompanyEnabled(companyEnabled);
        }
        if (lmnpEnabled != null) {
            user.setLmnpEnabled(lmnpEnabled);
        }
        user.setUpdatedAt(Instant.now());
        return AdminUserDto.from(users.save(user));
    }

    @Transactional
    public AdminUserDto updateRole(Long id, UserRole role) {
        AppUser user = require(id);
        user.setRole(role);
        user.setUpdatedAt(Instant.now());
        return AdminUserDto.from(users.save(user));
    }

    private AppUser require(Long id) {
        return users.findById(id)
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND, "Ce compte n'existe pas."));
    }
}
