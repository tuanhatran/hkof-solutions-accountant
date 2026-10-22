package fr.hkof.homeofficeexpenses.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import fr.hkof.homeofficeexpenses.service.JustificatifService;
import fr.hkof.homeofficeexpenses.service.llm.AnalyseJobService;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.AnalyseDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.AnalyseStartResponse;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.JustificatifDto;

@RestController
@RequestMapping("/api/justificatifs")
public class JustificatifController {

    private final JustificatifService service;
    private final AnalyseJobService analyseJobService;

    public JustificatifController(JustificatifService service, AnalyseJobService analyseJobService) {
        this.service = service;
        this.analyseJobService = analyseJobService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JustificatifDto uploader(@RequestParam("fichier") MultipartFile fichier) {
        return service.uploader(fichier);
    }

    @GetMapping("/{id}")
    public JustificatifDto obtenir(@PathVariable Long id) {
        return service.obtenir(id);
    }

    @GetMapping("/{id}/fichier")
    public ResponseEntity<byte[]> fichier(@PathVariable Long id) {
        JustificatifDto justificatif = service.obtenir(id);
        return ReponsesPdf.fichier(service.fichier(id), justificatif.typeMime(), justificatif.nomFichier());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void supprimer(@PathVariable Long id) {
        service.supprimer(id);
    }

    @PostMapping("/{id}/analyse")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public AnalyseStartResponse analyser(@PathVariable Long id) {
        AnalyseDto analyse = analyseJobService.lancer(id);
        return new AnalyseStartResponse(analyse.id(), analyse.statut());
    }
}
