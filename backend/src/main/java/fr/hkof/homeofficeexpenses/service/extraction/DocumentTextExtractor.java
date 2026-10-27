package fr.hkof.homeofficeexpenses.service.extraction;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Base64;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import fr.hkof.homeofficeexpenses.service.BusinessException;

@Service
public class DocumentTextExtractor {

    private final PdfDocumentReader pdfReader;
    private final OfficeDocumentReader officeReader = new OfficeDocumentReader();

    public DocumentTextExtractor(
            @Value("${analysis.pdftext.command:pdftotext}") String pdftextCommand,
            @Value("${analysis.pdftext.timeout:15s}") Duration pdftextTimeout,
            @Value("${analysis.ocr.enabled:true}") boolean ocrEnabled,
            OcrTextExtractor ocrTextExtractor) {
        this.pdfReader = new PdfDocumentReader(pdftextCommand, pdftextTimeout, ocrEnabled, ocrTextExtractor);
    }

    public Extraction extract(Path path, String mimeType, int maxPagesVision) {
        try {
            byte[] content = Files.readAllBytes(path);
            String mime = mimeType == null ? "" : mimeType;
            String fileName = path.toString().toLowerCase();
            if (mime.equals("application/pdf") || fileName.endsWith(".pdf")) {
                return pdfReader.extract(path, content, maxPagesVision);
            }
            if (mime.contains("wordprocessingml") || fileName.endsWith(".docx")) {
                return textOnly(officeReader.extractDocx(content));
            }
            if (mime.contains("spreadsheetml") || mime.equals("application/vnd.ms-excel")
                    || fileName.endsWith(".xlsx")
                    || fileName.endsWith(".xls")) {
                return textOnly(officeReader.extractSpreadsheet(content));
            }
            if (mime.equals("text/csv") || mime.equals("text/plain")
                    || fileName.endsWith(".csv")
                    || fileName.endsWith(".txt")) {
                return textOnly(truncate(new String(content, StandardCharsets.UTF_8)));
            }
            if (mime.startsWith("image/")) {
                return new Extraction("", List.of(Base64.getEncoder().encodeToString(content)), true, 1);
            }
            throw new BusinessException("DOCUMENT_UNSUPPORTED_FORMAT",
                    "Format de document non pris en charge pour l'analyse.");
        } catch (IOException ex) {
            throw new BusinessException("DOCUMENT_UNREADABLE", "Impossible de lire le document : " + ex.getMessage());
        }
    }

    public String truncate(String text) {
        return DocumentTextNormalizer.truncate(text);
    }

    private Extraction textOnly(String text) {
        return new Extraction(text, List.of(), false, 0);
    }

    public record Extraction(String text, List<String> imagesBase64, boolean imageOnly, int pageCount) {
    }
}
