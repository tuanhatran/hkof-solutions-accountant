package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.domain.UserRole;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;
import fr.hkof.homeofficeexpenses.web.dto.AdminUserDtos.AdminUserDto;

class AdminUserServiceTest {

    private final AppUserRepository users = mock(AppUserRepository.class);
    private final AdminUserService service = new AdminUserService(users);

    @Test
    @DisplayName("Listing users exposes the role and both module flags")
    void listsUsers() {
        when(users.findAll(any(Sort.class))).thenReturn(List.of(user(1L, UserRole.ADMIN, true, false)));

        List<AdminUserDto> result = service.listUsers();

        assertThat(result).singleElement().satisfies(dto -> {
            assertThat(dto.id()).isEqualTo(1L);
            assertThat(dto.email()).isEqualTo("someone@example.test");
            assertThat(dto.role()).isEqualTo(UserRole.ADMIN);
            assertThat(dto.companyEnabled()).isTrue();
            assertThat(dto.lmnpEnabled()).isFalse();
        });
    }

    @Test
    @DisplayName("Updating modules applies only the provided flags")
    void updatesProvidedModuleFlags() {
        AppUser user = user(2L, UserRole.USER, true, true);
        when(users.findById(2L)).thenReturn(Optional.of(user));
        when(users.save(user)).thenReturn(user);

        AdminUserDto dto = service.updateModules(2L, false, null);

        assertThat(dto.companyEnabled()).isFalse();
        assertThat(dto.lmnpEnabled()).isTrue();
        verify(users).save(user);
    }

    @Test
    @DisplayName("Updating modules without any flag is rejected")
    void rejectsEmptyModuleUpdate() {
        assertThatThrownBy(() -> service.updateModules(2L, null, null))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", AdminUserService.MODULES_REQUIRED);
    }

    @Test
    @DisplayName("Updating the role persists the new role")
    void updatesRole() {
        AppUser user = user(3L, UserRole.USER, true, true);
        when(users.findById(3L)).thenReturn(Optional.of(user));
        when(users.save(user)).thenReturn(user);

        AdminUserDto dto = service.updateRole(3L, UserRole.ADMIN);

        assertThat(dto.role()).isEqualTo(UserRole.ADMIN);
    }

    @Test
    @DisplayName("An unknown account answers USER_NOT_FOUND")
    void rejectsUnknownUser() {
        when(users.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateRole(99L, UserRole.ADMIN))
                .isInstanceOf(NotFoundException.class)
                .hasFieldOrPropertyWithValue("code", AdminUserService.USER_NOT_FOUND);
    }

    private static AppUser user(Long id, UserRole role, boolean companyEnabled, boolean lmnpEnabled) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setEmail("someone@example.test");
        user.setPasswordHash("hash");
        user.setConfirmed(true);
        user.setRole(role);
        user.setCompanyEnabled(companyEnabled);
        user.setLmnpEnabled(lmnpEnabled);
        return user;
    }
}
