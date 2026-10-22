package fr.hkof.homeofficeexpenses.service.extraction;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
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
import org.springframework.stereotype.Service;

import fr.hkof.homeofficeexpenses.service.BusinessException;

@Service
public class DocumentTextExtractor {

    private static final int MAX_LENGTH = 24_000;
    private static final int MAX_TEXT_PAGES = 20;

    public Extraction extract(Path path, String mimeType, int maxPagesVision) {
        try {
            byte[] content = Files.readAllBytes(path);
            String mime = mimeType == null ? "" : mimeType;
            if (mime.equals("application/pdf") || path.toString().toLowerCase().endsWith(".pdf")) {
                return extractPdf(content, maxPagesVision);
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

    private Extraction extractPdf(byte[] content, int maxPagesVision) throws IOException {
        try (PDDocument document = PDDocument.load(content)) {
            int pages = document.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setEndPage(Math.min(pages, MAX_TEXT_PAGES));
            String text = stripper.getText(document).trim();
            if (text.length() >= 20) {
                return textOnly(truncate(text));
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
