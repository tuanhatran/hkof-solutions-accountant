package fr.hkof.homeofficeexpenses.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.homeofficeexpenses.service.AgencyService;
import fr.hkof.homeofficeexpenses.web.dto.AgencyDtos.AgencyDto;
import fr.hkof.homeofficeexpenses.web.dto.AgencyDtos.AgencyRequest;

@RestController
@RequestMapping("/api/agency")
public class AgencyController {

    private final AgencyService service;

    public AgencyController(AgencyService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<AgencyDto> getAgency() {
        return service.get()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping
    public AgencyDto saveAgency(@RequestBody AgencyRequest request) {
        return service.save(request);
    }
}
