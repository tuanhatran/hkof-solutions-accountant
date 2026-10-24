package fr.hkof.homeofficeexpenses.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.homeofficeexpenses.service.RentConfigurationService;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LandlordDto;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LandlordRequest;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LeaseDto;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LeaseRequest;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.TenantDto;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.TenantRequest;

@RestController
@RequestMapping("/api")
public class RentConfigurationController {

    private final RentConfigurationService service;

    public RentConfigurationController(RentConfigurationService service) {
        this.service = service;
    }

    @GetMapping("/landlords")
    public List<LandlordDto> listLandlords() {
        return service.listLandlords();
    }

    @PostMapping("/landlords")
    @ResponseStatus(HttpStatus.CREATED)
    public LandlordDto createLandlord(@RequestBody LandlordRequest request) {
        return service.createLandlord(request);
    }

    @PutMapping("/landlords/{id}")
    public LandlordDto updateLandlord(@PathVariable Long id, @RequestBody LandlordRequest request) {
        return service.updateLandlord(id, request);
    }

    @DeleteMapping("/landlords/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLandlord(@PathVariable Long id) {
        service.deleteLandlord(id);
    }

    @GetMapping("/tenants")
    public List<TenantDto> listTenants() {
        return service.listTenants();
    }

    @PostMapping("/tenants")
    @ResponseStatus(HttpStatus.CREATED)
    public TenantDto createTenant(@RequestBody TenantRequest request) {
        return service.createTenant(request);
    }

    @PutMapping("/tenants/{id}")
    public TenantDto updateTenant(@PathVariable Long id, @RequestBody TenantRequest request) {
        return service.updateTenant(id, request);
    }

    @DeleteMapping("/tenants/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTenant(@PathVariable Long id) {
        service.deleteTenant(id);
    }

    @GetMapping("/leases")
    public List<LeaseDto> listLeases() {
        return service.listLeases();
    }

    @PostMapping("/leases")
    @ResponseStatus(HttpStatus.CREATED)
    public LeaseDto createLease(@RequestBody LeaseRequest request) {
        return service.createLease(request);
    }

    @PutMapping("/leases/{id}")
    public LeaseDto updateLease(@PathVariable Long id, @RequestBody LeaseRequest request) {
        return service.updateLease(id, request);
    }

    @DeleteMapping("/leases/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLease(@PathVariable Long id) {
        service.deleteLease(id);
    }
}
