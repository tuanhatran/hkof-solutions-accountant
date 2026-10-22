package fr.hkof.fraisocc.web;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.fraisocc.service.E2eResetService;

@RestController
@RequestMapping("/api/e2e")
@Profile("e2e")
public class E2eController {

    private final E2eResetService service;

    public E2eController(E2eResetService service) {
        this.service = service;
    }

    @PostMapping("/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reinitialiser() {
        service.reinitialiser();
    }
}
