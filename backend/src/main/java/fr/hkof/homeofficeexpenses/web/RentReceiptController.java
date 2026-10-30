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

import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.service.RentReceiptReceivedService;
import fr.hkof.homeofficeexpenses.service.RentReceiptService;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.RentReceiptDto;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.RentReceiptRequest;

@RestController
@RequestMapping("/api/rent-receipts")
public class RentReceiptController {

    private final RentReceiptService service;
    private final RentReceiptReceivedService receivedService;

    public RentReceiptController(RentReceiptService service, RentReceiptReceivedService receivedService) {
        this.service = service;
        this.receivedService = receivedService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RentReceiptDto createRentReceipt(@RequestBody RentReceiptRequest request) {
        return service.generate(request);
    }

    @GetMapping
    public List<RentReceiptDto> listRentReceipts(@RequestParam(required = false) Long companyId,
            @RequestParam(required = false) String month) {
        return service.list(companyId, month);
    }

    /**
     * Receipts issued by another account for a company owned by the current account. These
     * routes stay reachable with the LMNP module disabled: a company-only owner must still be
     * able to read and download its own received receipts.
     */
    @GetMapping("/received")
    public List<RentReceiptDto> listReceivedRentReceipts(@RequestParam(required = false) Long companyId,
            @RequestParam(required = false) String month) {
        return receivedService.list(companyId, month);
    }

    @GetMapping("/received/{id}/pdf")
    public ResponseEntity<byte[]> getReceivedRentReceiptPdf(@PathVariable Long id) {
        return PdfResponses.pdf(receivedService.pdf(id), "quittance_recue.pdf");
    }

    @GetMapping("/active")
    public ResponseEntity<RentReceiptDto> getActiveRentReceipt(@RequestParam String month,
            @RequestParam(required = false) Long companyId,
            @RequestParam(required = false) Long landlordId,
            @RequestParam(required = false) Long tenantId,
            @RequestParam(required = false) Long tenantCompanyId) {
        RentReceipt rentReceipt = service.activeForMonth(companyId, month, landlordId, tenantId, tenantCompanyId);
        return rentReceipt == null
                ? ResponseEntity.noContent().build()
                : ResponseEntity.ok(service.toDto(rentReceipt));
    }

    @GetMapping("/{id}")
    public RentReceiptDto getRentReceipt(@PathVariable Long id) {
        return service.get(id);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> getRentReceiptPdf(@PathVariable Long id) {
        RentReceiptDto rentReceipt = service.get(id);
        return PdfResponses.pdf(service.pdf(id), "quittance_" + rentReceipt.month() + ".pdf");
    }

    @PostMapping("/preview")
    public ResponseEntity<byte[]> previewRentReceipt(@RequestBody RentReceiptRequest request) {
        return PdfResponses.pdf(service.preview(request), "quittance_apercu.pdf");
    }
}
