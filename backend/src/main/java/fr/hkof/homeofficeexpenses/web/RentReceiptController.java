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
import fr.hkof.homeofficeexpenses.service.RentReceiptService;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.RentReceiptDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.RentReceiptRequest;

@RestController
@RequestMapping("/api/rent-receipts")
public class RentReceiptController {

    private final RentReceiptService service;

    public RentReceiptController(RentReceiptService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RentReceiptDto createRentReceipt(@RequestBody RentReceiptRequest request) {
        return service.generer(request);
    }

    @GetMapping
    public List<RentReceiptDto> listRentReceipts(@RequestParam(required = false) String month) {
        return service.lister(month);
    }

    @GetMapping("/active")
    public ResponseEntity<RentReceiptDto> getActiveRentReceipt(@RequestParam String month) {
        RentReceipt rentReceipt = service.activePourMonth(month);
        return rentReceipt == null
                ? ResponseEntity.noContent().build()
                : ResponseEntity.ok(service.versDto(rentReceipt));
    }

    @GetMapping("/{id}")
    public RentReceiptDto getRentReceipt(@PathVariable Long id) {
        return service.obtenir(id);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> getRentReceiptPdf(@PathVariable Long id) {
        RentReceiptDto rentReceipt = service.obtenir(id);
        return PdfResponses.pdf(service.pdf(id), "quittance_" + rentReceipt.month() + ".pdf");
    }

    @PostMapping("/preview")
    public ResponseEntity<byte[]> previewRentReceipt(@RequestBody RentReceiptRequest request) {
        return PdfResponses.pdf(service.apercu(request), "quittance_apercu.pdf");
    }
}
