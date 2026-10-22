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

import fr.hkof.homeofficeexpenses.service.ReceiptService;
import fr.hkof.homeofficeexpenses.service.llm.AnalysisJobService;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.AnalysisDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.AnalysisStartResponse;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.ReceiptDto;

@RestController
@RequestMapping("/api/justificatifs")
public class ReceiptController {

    private final ReceiptService service;
    private final AnalysisJobService analysisJobService;

    public ReceiptController(ReceiptService service, AnalysisJobService analysisJobService) {
        this.service = service;
        this.analysisJobService = analysisJobService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReceiptDto uploader(@RequestParam("fichier") MultipartFile file) {
        return service.uploader(file);
    }

    @GetMapping("/{id}")
    public ReceiptDto obtenir(@PathVariable Long id) {
        return service.obtenir(id);
    }

    @GetMapping("/{id}/fichier")
    public ResponseEntity<byte[]> file(@PathVariable Long id) {
        ReceiptDto receipt = service.obtenir(id);
        return PdfResponses.file(service.file(id), receipt.mimeType(), receipt.fileName());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @PostMapping("/{id}/analyse")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public AnalysisStartResponse analyser(@PathVariable Long id) {
        AnalysisDto analysis = analysisJobService.lancer(id);
        return new AnalysisStartResponse(analysis.id(), analysis.status());
    }
}
