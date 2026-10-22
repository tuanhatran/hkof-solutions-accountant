package fr.hkof.fraisocc.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.fraisocc.service.ParametresService;
import fr.hkof.fraisocc.web.dto.Dtos.ParametresDto;
import fr.hkof.fraisocc.web.dto.Dtos.ParametresRequest;

@RestController
@RequestMapping("/api/parametres")
public class ParametresController {

    private final ParametresService service;

    public ParametresController(ParametresService service) {
        this.service = service;
    }

    @GetMapping
    public ParametresDto obtenir() {
        return service.obtenir();
    }

    @PutMapping
    public ParametresDto mettreAJour(@RequestBody ParametresRequest request) {
        return service.mettreAJour(request);
    }
}
