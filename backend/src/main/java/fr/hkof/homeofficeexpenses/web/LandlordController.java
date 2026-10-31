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

import fr.hkof.homeofficeexpenses.service.LandlordService;
import fr.hkof.homeofficeexpenses.web.dto.LandlordDtos.LandlordDto;
import fr.hkof.homeofficeexpenses.web.dto.LandlordDtos.LandlordRequest;

@RestController
@RequestMapping("/api/landlords")
public class LandlordController {

    private final LandlordService service;

    public LandlordController(LandlordService service) {
        this.service = service;
    }

    @GetMapping
    public List<LandlordDto> listLandlords() {
        return service.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LandlordDto createLandlord(@RequestBody LandlordRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public LandlordDto updateLandlord(@PathVariable Long id, @RequestBody LandlordRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLandlord(@PathVariable Long id) {
        service.delete(id);
    }
}
