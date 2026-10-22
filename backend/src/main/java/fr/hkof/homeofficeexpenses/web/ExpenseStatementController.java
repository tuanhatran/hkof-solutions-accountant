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

import fr.hkof.homeofficeexpenses.domain.ExpenseStatement;
import fr.hkof.homeofficeexpenses.service.ExpenseStatementService;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.DraftDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.CalculationResponse;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.StatementPreviewRequest;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.StatementCalculRequest;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.StatementDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.StatementGenerationRequest;

@RestController
@RequestMapping("/api/notes-frais")
public class ExpenseStatementController {

    private final ExpenseStatementService service;

    public ExpenseStatementController(ExpenseStatementService service) {
        this.service = service;
    }

    @PostMapping("/brouillon")
    public DraftDto draft(@RequestParam String month) {
        return service.draft(month);
    }

    @PostMapping("/calcul")
    public CalculationResponse calculate(@RequestBody StatementCalculRequest request) {
        return service.calculate(request);
    }

    @PostMapping("/apercu")
    public ResponseEntity<byte[]> apercu(@RequestBody StatementPreviewRequest request) {
        return PdfResponses.pdf(service.apercu(request), "note_frais_apercu.pdf");
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StatementDto generer(@RequestBody StatementGenerationRequest request) {
        return service.generer(request);
    }

    @GetMapping
    public List<StatementDto> lister(@RequestParam(required = false) String month) {
        return service.lister(month);
    }

    @GetMapping("/active")
    public ResponseEntity<StatementDto> active(@RequestParam String month) {
        ExpenseStatement statement = service.activePourMonth(month);
        return statement == null
                ? ResponseEntity.noContent().build()
                : ResponseEntity.ok(service.versDto(statement));
    }

    @GetMapping("/{id}")
    public StatementDto obtenir(@PathVariable Long id) {
        return service.obtenir(id);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> pdf(@PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean complete) {
        StatementDto statement = service.obtenir(id);
        String name = "note_frais_" + statement.month() + (complete ? "_complet" : "") + ".pdf";
        return PdfResponses.pdf(service.pdf(id, complete), name);
    }
}
