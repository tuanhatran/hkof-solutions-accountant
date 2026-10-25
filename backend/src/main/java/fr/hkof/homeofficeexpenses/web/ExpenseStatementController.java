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

import fr.hkof.homeofficeexpenses.service.ExpenseStatementService;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.DraftDto;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.CalculationResponse;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.StatementPreviewRequest;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.StatementCalculationRequest;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.StatementDto;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.StatementGenerationRequest;

@RestController
@RequestMapping("/api/expense-statements")
public class ExpenseStatementController {

    private final ExpenseStatementService service;

    public ExpenseStatementController(ExpenseStatementService service) {
        this.service = service;
    }

    @PostMapping("/draft")
    public DraftDto createStatementDraft(@RequestParam Long companyId, @RequestParam String month,
            @RequestParam(required = false) Long leaseId) {
        return service.draft(companyId, month, leaseId);
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
    public List<StatementDto> listExpenseStatements(@RequestParam Long companyId,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) Long leaseId) {
        return service.list(companyId, month, leaseId);
    }

    @GetMapping("/active")
    public ResponseEntity<StatementDto> getActiveExpenseStatement(@RequestParam Long companyId,
            @RequestParam String month) {
        return service.activeDtoForMonth(companyId, month)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
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

    @GetMapping("/{id}/zip")
    public ResponseEntity<byte[]> getExpenseStatementZip(@PathVariable Long id) {
        StatementDto statement = service.get(id);
        String name = "note_frais_" + statement.month() + "_complet.zip";
        return PdfResponses.attachment(service.zip(id), "application/zip", name);
    }
}
