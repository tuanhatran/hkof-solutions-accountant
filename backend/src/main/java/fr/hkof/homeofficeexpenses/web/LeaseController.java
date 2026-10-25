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

import fr.hkof.homeofficeexpenses.service.LeaseService;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LeaseDto;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LeaseRequest;

@RestController
@RequestMapping("/api/leases")
public class LeaseController {

    private final LeaseService service;

    public LeaseController(LeaseService service) {
        this.service = service;
    }

    @GetMapping
    public List<LeaseDto> listLeases() {
        return service.listLeases();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LeaseDto createLease(@RequestBody LeaseRequest request) {
        return service.createLease(request);
    }

    @PutMapping("/{id}")
    public LeaseDto updateLease(@PathVariable Long id, @RequestBody LeaseRequest request) {
        return service.updateLease(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLease(@PathVariable Long id) {
        service.deleteLease(id);
    }
}
