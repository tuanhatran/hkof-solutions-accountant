package fr.hkof.homeofficeexpenses.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.homeofficeexpenses.service.SettingsService;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.SettingsDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.SettingsRequest;

@RestController
@RequestMapping("/api/parametres")
public class SettingsController {

    private final SettingsService service;

    public SettingsController(SettingsService service) {
        this.service = service;
    }

    @GetMapping
    public SettingsDto obtenir() {
        return service.obtenir();
    }

    @PutMapping
    public SettingsDto mettreAJour(@RequestBody SettingsRequest request) {
        return service.mettreAJour(request);
    }
}
