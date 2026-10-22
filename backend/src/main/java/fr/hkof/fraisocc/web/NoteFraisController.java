package fr.hkof.fraisocc.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.fraisocc.domain.NoteFrais;
import fr.hkof.fraisocc.service.NoteFraisService;
import fr.hkof.fraisocc.web.dto.Dtos.BrouillonDto;
import fr.hkof.fraisocc.web.dto.Dtos.CalculResponse;
import fr.hkof.fraisocc.web.dto.Dtos.NoteApercuRequest;
import fr.hkof.fraisocc.web.dto.Dtos.NoteCalculRequest;
import fr.hkof.fraisocc.web.dto.Dtos.NoteDto;
import fr.hkof.fraisocc.web.dto.Dtos.NoteGenerationRequest;

@RestController
@RequestMapping("/api/notes-frais")
public class NoteFraisController {

    private final NoteFraisService service;

    public NoteFraisController(NoteFraisService service) {
        this.service = service;
    }

    @PostMapping("/brouillon")
    public BrouillonDto brouillon(@RequestParam String mois) {
        return service.brouillon(mois);
    }

    @PostMapping("/calcul")
    public CalculResponse calculer(@RequestBody NoteCalculRequest request) {
        return service.calculer(request);
    }

    @PostMapping("/apercu")
    public ResponseEntity<byte[]> apercu(@RequestBody NoteApercuRequest request) {
        return ReponsesPdf.pdf(service.apercu(request), "note_frais_apercu.pdf");
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoteDto generer(@RequestBody NoteGenerationRequest request) {
        return service.generer(request);
    }

    @GetMapping
    public List<NoteDto> lister(@RequestParam(required = false) String mois) {
        return service.lister(mois);
    }

    @GetMapping("/active")
    public ResponseEntity<NoteDto> active(@RequestParam String mois) {
        NoteFrais note = service.activePourMois(mois);
        return note == null
                ? ResponseEntity.noContent().build()
                : ResponseEntity.ok(service.versDto(note));
    }

    @GetMapping("/{id}")
    public NoteDto obtenir(@PathVariable Long id) {
        return service.obtenir(id);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> pdf(@PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean complet) {
        NoteDto note = service.obtenir(id);
        String nom = "note_frais_" + note.mois() + (complet ? "_complet" : "") + ".pdf";
        return ReponsesPdf.pdf(service.pdf(id, complet), nom);
    }
}
