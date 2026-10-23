package fr.hkof.homeofficeexpenses.service.extraction;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import javax.imageio.ImageIO;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import fr.hkof.homeofficeexpenses.service.BusinessException;

@Service
public class DocumentTextExtractor {

    private static final int MAX_LENGTH = 24_000;
    private static final int MAX_TEXT_PAGES = 20;
    private static final int MINIMUM_TEXT_LENGTH = 20;
    private static final int OCR_DPI = 300;

    private final String pdftextCommand;
    private final Duration pdftextTimeout;
    private final boolean ocrEnabled;
    private final OcrTextExtractor ocrTextExtractor;

    public DocumentTextExtractor(
            @Value("${analysis.pdftext.command:pdftotext}") String pdftextCommand,
            @Value("${analysis.pdftext.timeout:15s}") Duration pdftextTimeout,
            @Value("${analysis.ocr.enabled:true}") boolean ocrEnabled,
            OcrTextExtractor ocrTextExtractor) {
        this.pdftextCommand = pdftextCommand;
        this.pdftextTimeout = pdftextTimeout;
        this.ocrEnabled = ocrEnabled;
        this.ocrTextExtractor = ocrTextExtractor;
    }

    public Extraction extract(Path path, String mimeType, int maxPagesVision) {
        try {
            byte[] content = Files.readAllBytes(path);
            String mime = mimeType == null ? "" : mimeType;
            if (mime.equals("application/pdf") || path.toString().toLowerCase().endsWith(".pdf")) {
                return extractPdf(path, content, maxPagesVision);
            }
            if (mime.contains("wordprocessingml") || path.toString().toLowerCase().endsWith(".docx")) {
                return textOnly(extractDocx(content));
            }
            if (mime.contains("spreadsheetml") || mime.equals("application/vnd.ms-excel")
                    || path.toString().toLowerCase().endsWith(".xlsx")
                    || path.toString().toLowerCase().endsWith(".xls")) {
                return textOnly(extractSpreadsheet(content));
            }
            if (mime.equals("text/csv") || mime.equals("text/plain")
                    || path.toString().toLowerCase().endsWith(".csv")
                    || path.toString().toLowerCase().endsWith(".txt")) {
                return textOnly(truncate(new String(content, StandardCharsets.UTF_8)));
            }
            if (mime.startsWith("image/")) {
                return new Extraction("", List.of(Base64.getEncoder().encodeToString(content)), true, 1);
            }
            throw new BusinessException("Format de document non pris en charge pour l'analyse.");
        } catch (IOException ex) {
            throw new BusinessException("Impossible de lire le document : " + ex.getMessage());
        }
    }

    private Extraction extractPdf(Path path, byte[] content, int maxPagesVision) throws IOException {
        String externalText = extractWithPdftext(path);
        if (externalText != null) {
            return textOnly(externalText);
        }
        try (PDDocument document = PDDocument.load(content)) {
            int pages = document.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setEndPage(Math.min(pages, MAX_TEXT_PAGES));
            String text = stripper.getText(document).trim();
            if (text.length() >= MINIMUM_TEXT_LENGTH) {
                return textOnly(truncate(text));
            }
            if (ocrEnabled) {
                String ocrText = ocrPages(document, pages, maxPagesVision);
                if (ocrText.length() >= MINIMUM_TEXT_LENGTH) {
                    return textOnly(ocrText);
                }
            }
            List<String> images = new ArrayList<>();
            PDFRenderer renderer = new PDFRenderer(document);
            int limit = Math.min(pages, Math.max(1, maxPagesVision));
            for (int i = 0; i < limit; i++) {
                BufferedImage image = renderer.renderImageWithDPI(i, 150, ImageType.RGB);
                ByteArrayOutputStream png = new ByteArrayOutputStream();
                ImageIO.write(image, "png", png);
                images.add(Base64.getEncoder().encodeToString(png.toByteArray()));
            }
            return new Extraction("", images, true, pages);
        }
    }

    /**
     * Extracts the first pages with {@code pdftotext -layout}. Returns {@code null} when the
     * binary is missing, fails or times out, so the caller can use the PDFBox fallback.
     */
    private String extractWithPdftext(Path path) {
        if (pdftextCommand == null || pdftextCommand.isBlank()) {
            return null;
        }
        List<String> argv = List.of(
                pdftextCommand,
                "-q",
                "-layout",
                "-enc",
                "UTF-8",
                "-f",
                "1",
                "-l",
                Integer.toString(MAX_TEXT_PAGES),
                path.toAbsolutePath().normalize().toString(),
                "-");
        ExternalCommand.Result result = ExternalCommand.run(argv, pdftextTimeout, MAX_LENGTH);
        if (result.timedOut() || result.exitCode() != 0) {
            return null;
        }
        String text = layoutPreserving(result.stdout());
        return text.length() >= MINIMUM_TEXT_LENGTH ? text : null;
    }

    /** Renders the first pages at {@value #OCR_DPI} dpi and joins their OCR text. */
    private String ocrPages(PDDocument document, int pages, int maxPagesVision) {
        PDFRenderer renderer = new PDFRenderer(document);
        int limit = Math.min(pages, Math.max(1, maxPagesVision));
        StringBuilder text = new StringBuilder();
        for (int i = 0; i < limit; i++) {
            Path png = null;
            try {
                BufferedImage image = renderer.renderImageWithDPI(i, OCR_DPI, ImageType.RGB);
                png = Files.createTempFile("hoe-ocr-", ".png");
                restrictToOwner(png);
                if (!ImageIO.write(image, "png", png.toFile())) {
                    continue;
                }
                String pageText = ocrTextExtractor.recognize(png);
                if (!pageText.isBlank()) {
                    if (!text.isEmpty()) {
                        text.append("\n\n");
                    }
                    text.append(pageText.strip());
                }
            } catch (IOException | RuntimeException ex) {
                // OCR is best effort: fall back to the vision path when a page fails.
            } finally {
                deleteQuietly(png);
            }
        }
        return layoutPreserving(text.toString());
    }

    private static void restrictToOwner(Path file) {
        try {
            Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
        } catch (IOException | UnsupportedOperationException ignored) {
            // Non-POSIX file system: temporary file permissions stay at the platform default.
        }
    }

    private static void deleteQuietly(Path file) {
        if (file == null) {
            return;
        }
        try {
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
            // Best-effort cleanup of a temporary rendering.
        }
    }

    /**
     * Normalizes line endings and caps the text while preserving the layout: inner spaces and
     * blank lines are kept, unlike {@link #truncate(String)}.
     */
    private String layoutPreserving(String text) {
        if (text == null) {
            return "";
        }
        String normalized = text
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replace('\u000C', '\n');
        String[] lines = normalized.split("\n", -1);
        StringBuilder result = new StringBuilder(normalized.length());
        for (int i = 0; i < lines.length; i++) {
            if (i > 0) {
                result.append('\n');
            }
            result.append(stripTrailingSpaces(lines[i]));
        }
        String trimmed = result.toString().trim();
        if (trimmed.length() <= MAX_LENGTH) {
            return trimmed;
        }
        int head = MAX_LENGTH / 2;
        int tail = MAX_LENGTH - head;
        return trimmed.substring(0, head) + "\n[…]\n" + trimmed.substring(trimmed.length() - tail);
    }

    private static String stripTrailingSpaces(String line) {
        int end = line.length();
        while (end > 0 && (line.charAt(end - 1) == ' ' || line.charAt(end - 1) == '\t')) {
            end--;
        }
        return line.substring(0, end);
    }

    private Extraction textOnly(String text) {
        return new Extraction(text, List.of(), false, 0);
    }

    private String extractDocx(byte[] content) throws IOException {
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(content))) {
            StringBuilder text = new StringBuilder();
            for (XWPFParagraph paragraph : document.getParagraphs()) {
                if (!paragraph.getText().isBlank()) {
                    text.append(paragraph.getText()).append('\n');
                }
            }
            for (XWPFTable table : document.getTables()) {
                for (XWPFTableRow line : table.getRows()) {
                    List<String> cells = new ArrayList<>();
                    for (XWPFTableCell cell : line.getTableCells()) {
                        cells.add(cell.getText());
                    }
                    text.append(String.join(" | ", cells)).append('\n');
                }
            }
            return truncate(text.toString());
        }
    }

    private String extractSpreadsheet(byte[] content) throws IOException {
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(content))) {
            DataFormatter formatter = new DataFormatter(java.util.Locale.FRANCE);
            StringBuilder text = new StringBuilder();
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                Sheet sheet = workbook.getSheetAt(i);
                text.append("Feuille : ").append(sheet.getSheetName()).append('\n');
                int rowLimit = Math.min(sheet.getLastRowNum(), 2000);
                for (int j = 0; j <= rowLimit; j++) {
                    Row line = sheet.getRow(j);
                    if (line == null) {
                        continue;
                    }
                    List<String> values = new ArrayList<>();
                    int last = Math.min(line.getLastCellNum(), 50);
                    for (int k = 0; k < last; k++) {
                        Cell cell = line.getCell(k);
                        values.add(cell == null ? "" : formatter.formatCellValue(cell));
                    }
                    if (values.stream().anyMatch(v -> !v.isBlank())) {
                        text.append(String.join(" | ", values)).append('\n');
                    }
                }
            }
            return truncate(text.toString());
        }
    }

    public String truncate(String text) {
        if (text == null) {
            return "";
        }
        String normalized = text.replaceAll("[\\t\\r]+", " ").replaceAll(" {2,}", " ").trim();
        if (normalized.length() <= MAX_LENGTH) {
            return normalized;
        }
        int head = MAX_LENGTH / 2;
        int tail = MAX_LENGTH - head;
        return normalized.substring(0, head) + "\n[…]\n" + normalized.substring(normalized.length() - tail);
    }

    public record Extraction(String text, List<String> imagesBase64, boolean imageOnly, int pageCount) {
    }
}
