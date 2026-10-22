package fr.hkof.fraisocc.web;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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

import fr.hkof.fraisocc.domain.TypeTemplate;
import fr.hkof.fraisocc.service.template.TemplateDataService;
import fr.hkof.fraisocc.service.template.TemplateService;
import fr.hkof.fraisocc.web.dto.Dtos.TemplateDto;
import fr.hkof.fraisocc.web.dto.Dtos.TemplateVariableDto;

@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    private final TemplateService service;
    private final TemplateDataService dataService;

    public TemplateController(TemplateService service, TemplateDataService dataService) {
        this.service = service;
        this.dataService = dataService;
    }

    @GetMapping
    public List<TemplateDto> lister(@RequestParam TypeTemplate type) {
        return service.lister(type);
    }

    @GetMapping("/variables")
    public List<TemplateVariableDto> variables(@RequestParam TypeTemplate type) {
        return service.variables(type);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TemplateDto uploader(@RequestParam TypeTemplate type, @RequestParam String nom,
            @RequestParam("fichier") MultipartFile fichier) {
        return service.uploader(type, nom, fichier);
    }

    @PostMapping("/{id}/activer")
    public TemplateDto activer(@PathVariable Long id) {
        return service.activer(id);
    }

    @GetMapping("/{id}/fichier")
    public ResponseEntity<byte[]> fichier(@PathVariable Long id) {
        TemplateDto template = service.versDto(service.parId(id));
        return ReponsesPdf.fichier(service.fichier(id), "text/html;charset=UTF-8",
                template.nom() + "_v" + template.version() + ".html");
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void supprimer(@PathVariable Long id) {
        service.supprimer(id);
    }

    @GetMapping("/defaut/{type}")
    public ResponseEntity<byte[]> defaut(@PathVariable TypeTemplate type) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(service.fichierDefaut(type));
    }

    @PostMapping("/defaut/{type}")
    public TemplateDto reinitialiser(@PathVariable TypeTemplate type) {
        return service.reinitialiser(type);
    }

    @PostMapping("/{id}/apercu")
    public ResponseEntity<byte[]> apercu(@PathVariable Long id) {
        TemplateDto template = service.versDto(service.parId(id));
        byte[] pdf = service.apercu(id, dataService.donneesExemple(TypeTemplate.valueOf(template.type())));
        return ReponsesPdf.pdf(pdf, "apercu_template.pdf");
    }
}
