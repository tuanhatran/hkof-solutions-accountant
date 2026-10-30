package fr.hkof.homeofficeexpenses.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.homeofficeexpenses.service.AdminUserService;
import fr.hkof.homeofficeexpenses.web.dto.AdminUserDtos.AdminUserDto;
import fr.hkof.homeofficeexpenses.web.dto.AdminUserDtos.ModuleFlagsRequest;
import fr.hkof.homeofficeexpenses.web.dto.AdminUserDtos.RoleRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService service;

    public AdminUserController(AdminUserService service) {
        this.service = service;
    }

    @GetMapping
    public List<AdminUserDto> listUsers() {
        return service.listUsers();
    }

    @PatchMapping("/{id}/modules")
    public AdminUserDto updateModules(@PathVariable Long id, @Valid @RequestBody ModuleFlagsRequest request) {
        return service.updateModules(id, request.companyEnabled(), request.lmnpEnabled());
    }

    @PatchMapping("/{id}/role")
    public AdminUserDto updateRole(@PathVariable Long id, @Valid @RequestBody RoleRequest request) {
        return service.updateRole(id, request.role());
    }
}
