package fr.hkof.homeofficeexpenses.web;

import java.util.List;

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

import fr.hkof.homeofficeexpenses.domain.SignatureType;
import fr.hkof.homeofficeexpenses.service.SignatureService;
import fr.hkof.homeofficeexpenses.web.dto.SignatureDtos.SignatureDto;

@RestController
@RequestMapping("/api/signatures")
public class SignatureController {

    private final SignatureService service;

    public SignatureController(SignatureService service) {
        this.service = service;
    }

    @GetMapping
    public List<SignatureDto> listSignatures(@RequestParam(required = false) Long companyId,
            @RequestParam(required = false) Long employeeId) {
        return service.list(companyId, employeeId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SignatureDto createSignature(@RequestParam SignatureType type,
            @RequestParam(required = false) Long landlordId, @RequestParam(required = false) Long employeeId,
            @RequestParam String name, @RequestParam("file") MultipartFile file) {
        return service.create(type, landlordId, employeeId, name, file);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSignature(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> getSignatureImage(@PathVariable Long id) {
        SignatureService.SignatureImage image = service.image(id);
        return PdfResponses.file(image.content(), image.mimeType(), image.fileName());
    }
}
