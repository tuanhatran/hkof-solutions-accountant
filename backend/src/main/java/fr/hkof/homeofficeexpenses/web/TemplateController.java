package fr.hkof.homeofficeexpenses.web;

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

import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.service.template.TemplateDataService;
import fr.hkof.homeofficeexpenses.service.template.TemplateService;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.TemplateDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.TemplateVariableDto;

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
    public List<TemplateDto> lister(@RequestParam TemplateType type) {
        return service.lister(type);
    }

    @GetMapping("/variables")
    public List<TemplateVariableDto> variables(@RequestParam TemplateType type) {
        return service.variables(type);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TemplateDto uploader(@RequestParam TemplateType type, @RequestParam String name,
            @RequestParam("fichier") MultipartFile file) {
        return service.uploader(type, name, file);
    }

    @PostMapping("/{id}/activer")
    public TemplateDto activer(@PathVariable Long id) {
        return service.activer(id);
    }

    @GetMapping("/{id}/fichier")
    public ResponseEntity<byte[]> file(@PathVariable Long id) {
        TemplateDto template = service.versDto(service.parId(id));
        return PdfResponses.file(service.file(id), "text/html;charset=UTF-8",
                template.name() + "_v" + template.version() + ".html");
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/defaut/{type}")
    public ResponseEntity<byte[]> defaut(@PathVariable TemplateType type) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(service.fileDefaut(type));
    }

    @PostMapping("/defaut/{type}")
    public TemplateDto reinitialiser(@PathVariable TemplateType type) {
        return service.reinitialiser(type);
    }

    @PostMapping("/{id}/apercu")
    public ResponseEntity<byte[]> apercu(@PathVariable Long id) {
        TemplateDto template = service.versDto(service.parId(id));
        byte[] pdf = service.apercu(id, dataService.dataExample(TemplateType.valueOf(template.type())));
        return PdfResponses.pdf(pdf, "apercu_template.pdf");
    }
}
