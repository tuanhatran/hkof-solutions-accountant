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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.homeofficeexpenses.service.PosteService;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.PosteDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.PosteRequest;

@RestController
@RequestMapping("/api/postes")
public class PosteController {

    private final PosteService service;

    public PosteController(PosteService service) {
        this.service = service;
    }

    @GetMapping
    public List<PosteDto> lister(@RequestParam(defaultValue = "false") boolean tous) {
        return service.lister(tous);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PosteDto creer(@RequestBody PosteRequest request) {
        return service.creer(request);
    }

    @PutMapping("/{id}")
    public PosteDto mettreAJour(@PathVariable Long id, @RequestBody PosteRequest request) {
        return service.mettreAJour(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void supprimer(@PathVariable Long id) {
        service.supprimer(id);
    }
}
