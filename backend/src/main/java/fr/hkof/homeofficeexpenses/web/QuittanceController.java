package fr.hkof.homeofficeexpenses.web;

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

import fr.hkof.homeofficeexpenses.domain.Quittance;
import fr.hkof.homeofficeexpenses.service.QuittanceService;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.QuittanceDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.QuittanceRequest;

@RestController
@RequestMapping("/api/quittances")
public class QuittanceController {

    private final QuittanceService service;

    public QuittanceController(QuittanceService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public QuittanceDto generer(@RequestBody QuittanceRequest request) {
        return service.generer(request);
    }

    @GetMapping
    public List<QuittanceDto> lister(@RequestParam(required = false) String mois) {
        return service.lister(mois);
    }

    @GetMapping("/active")
    public ResponseEntity<QuittanceDto> active(@RequestParam String mois) {
        Quittance quittance = service.activePourMois(mois);
        return quittance == null
                ? ResponseEntity.noContent().build()
                : ResponseEntity.ok(service.versDto(quittance));
    }

    @GetMapping("/{id}")
    public QuittanceDto obtenir(@PathVariable Long id) {
        return service.obtenir(id);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> pdf(@PathVariable Long id) {
        QuittanceDto quittance = service.obtenir(id);
        return ReponsesPdf.pdf(service.pdf(id), "quittance_" + quittance.mois() + ".pdf");
    }

    @PostMapping("/apercu")
    public ResponseEntity<byte[]> apercu(@RequestBody QuittanceRequest request) {
        return ReponsesPdf.pdf(service.apercu(request), "quittance_apercu.pdf");
    }
}
