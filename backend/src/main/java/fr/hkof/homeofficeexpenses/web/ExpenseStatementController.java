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
import fr.hkof.homeofficeexpenses.web.dto.Dtos.StatementCalculationRequest;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.StatementDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.StatementGenerationRequest;

@RestController
@RequestMapping("/api/expense-statements")
public class ExpenseStatementController {

    private final ExpenseStatementService service;

    public ExpenseStatementController(ExpenseStatementService service) {
        this.service = service;
    }

    @PostMapping("/draft")
    public DraftDto createStatementDraft(@RequestParam String month) {
        return service.draft(month);
    }

    @PostMapping("/calculation")
    public CalculationResponse calculateStatement(@RequestBody StatementCalculationRequest request) {
        return service.calculate(request);
    }

    @PostMapping("/preview")
    public ResponseEntity<byte[]> previewStatement(@RequestBody StatementPreviewRequest request) {
        return PdfResponses.pdf(service.preview(request), "note_frais_apercu.pdf");
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StatementDto createExpenseStatement(@RequestBody StatementGenerationRequest request) {
        return service.generate(request);
    }

    @GetMapping
    public List<StatementDto> listExpenseStatements(@RequestParam(required = false) String month) {
        return service.list(month);
    }

    @GetMapping("/active")
    public ResponseEntity<StatementDto> getActiveExpenseStatement(@RequestParam String month) {
        ExpenseStatement statement = service.activeForMonth(month);
        return statement == null
                ? ResponseEntity.noContent().build()
                : ResponseEntity.ok(service.toDto(statement));
    }

    @GetMapping("/{id}")
    public StatementDto getExpenseStatement(@PathVariable Long id) {
        return service.get(id);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> getExpenseStatementPdf(@PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean complete) {
        StatementDto statement = service.get(id);
        String name = "note_frais_" + statement.month() + (complete ? "_complet" : "") + ".pdf";
        return PdfResponses.pdf(service.pdf(id, complete), name);
    }
}
