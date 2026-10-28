package fr.hkof.homeofficeexpenses.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.http.HttpStatus;

import fr.hkof.homeofficeexpenses.service.DocumentDraftService;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.RentReceiptDraftDto;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.RentReceiptDraftRequest;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.StatementDraftDto;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.StatementDraftRequest;

/**
 * Persisted editable form drafts of the generation pages. Distinct from the compute-only
 * {@code /api/expense-statements/draft} endpoint, which builds a statement proposal.
 */
@RestController
@RequestMapping("/api/drafts")
public class DocumentDraftController {

    private final DocumentDraftService service;

    public DocumentDraftController(DocumentDraftService service) {
        this.service = service;
    }

    @PutMapping("/rent-receipts")
    public RentReceiptDraftDto saveRentReceiptDraft(@RequestBody RentReceiptDraftRequest request) {
        return service.saveRentReceipt(request);
    }

    @GetMapping("/rent-receipts")
    public ResponseEntity<RentReceiptDraftDto> getRentReceiptDraft(@RequestParam String month,
            @RequestParam Long landlordId,
            @RequestParam(required = false) Long tenantId,
            @RequestParam(required = false) Long tenantCompanyId) {
        return service.findRentReceipt(month, landlordId, tenantId, tenantCompanyId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping("/expense-statements")
    public StatementDraftDto saveStatementDraft(@RequestBody StatementDraftRequest request) {
        return service.saveStatement(request);
    }

    @GetMapping("/expense-statements")
    public ResponseEntity<StatementDraftDto> getStatementDraft(@RequestParam Long companyId,
            @RequestParam String month) {
        return service.findStatement(companyId, month)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDraft(@PathVariable Long id) {
        service.delete(id);
    }
}
