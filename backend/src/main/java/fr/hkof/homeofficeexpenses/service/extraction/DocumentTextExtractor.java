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

    private static final int LONGUEUR_MAX = 24_000;
    private static final int PAGES_MAX_TEXTE = 20;

    public Extraction extraire(Path path, String mimeType, int maxPagesVision) {
        try {
            byte[] content = Files.readAllBytes(path);
            String mime = mimeType == null ? "" : mimeType;
            if (mime.equals("application/pdf") || path.toString().toLowerCase().endsWith(".pdf")) {
                return extrairePdf(content, maxPagesVision);
            }
            if (mime.contains("wordprocessingml") || path.toString().toLowerCase().endsWith(".docx")) {
                return textSeul(extraireDocx(content));
            }
            if (mime.contains("spreadsheetml") || mime.equals("application/vnd.ms-excel")
                    || path.toString().toLowerCase().endsWith(".xlsx")
                    || path.toString().toLowerCase().endsWith(".xls")) {
                return textSeul(extraireTableur(content));
            }
            if (mime.equals("text/csv") || mime.equals("text/plain")
                    || path.toString().toLowerCase().endsWith(".csv")
                    || path.toString().toLowerCase().endsWith(".txt")) {
                return textSeul(tronquer(new String(content, StandardCharsets.UTF_8)));
            }
            if (mime.startsWith("image/")) {
                return new Extraction("", List.of(Base64.getEncoder().encodeToString(content)), true, 1);
            }
            throw new BusinessException("Format de document non pris en charge pour l'analyse.");
        } catch (IOException ex) {
            throw new BusinessException("Impossible de lire le document : " + ex.getMessage());
        }
    }

    private Extraction extrairePdf(byte[] content, int maxPagesVision) throws IOException {
        try (PDDocument document = PDDocument.load(content)) {
            int pages = document.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setEndPage(Math.min(pages, PAGES_MAX_TEXTE));
            String text = stripper.getText(document).trim();
            if (text.length() >= 20) {
                return textSeul(tronquer(text));
            }
            List<String> images = new ArrayList<>();
            PDFRenderer renderer = new PDFRenderer(document);
            int limite = Math.min(pages, Math.max(1, maxPagesVision));
            for (int i = 0; i < limite; i++) {
                BufferedImage image = renderer.renderImageWithDPI(i, 150, ImageType.RGB);
                ByteArrayOutputStream png = new ByteArrayOutputStream();
                ImageIO.write(image, "png", png);
                images.add(Base64.getEncoder().encodeToString(png.toByteArray()));
            }
            return new Extraction("", images, true, pages);
        }
    }

    private Extraction textSeul(String text) {
        return new Extraction(text, List.of(), false, 0);
    }

    private String extraireDocx(byte[] content) throws IOException {
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(content))) {
            StringBuilder text = new StringBuilder();
            for (XWPFParagraph paragraphe : document.getParagraphs()) {
                if (!paragraphe.getText().isBlank()) {
                    text.append(paragraphe.getText()).append('\n');
                }
            }
            for (XWPFTable table : document.getTables()) {
                for (XWPFTableRow line : table.getRows()) {
                    List<String> cellules = new ArrayList<>();
                    for (XWPFTableCell cellule : line.getTableCells()) {
                        cellules.add(cellule.getText());
                    }
                    text.append(String.join(" | ", cellules)).append('\n');
                }
            }
            return tronquer(text.toString());
        }
    }

    private String extraireTableur(byte[] content) throws IOException {
        try (Workbook classeur = WorkbookFactory.create(new ByteArrayInputStream(content))) {
            DataFormatter formatter = new DataFormatter(java.util.Locale.FRANCE);
            StringBuilder text = new StringBuilder();
            for (int i = 0; i < classeur.getNumberOfSheets(); i++) {
                Sheet feuille = classeur.getSheetAt(i);
                text.append("Feuille : ").append(feuille.getSheetName()).append('\n');
                int limiteLines = Math.min(feuille.getLastRowNum(), 2000);
                for (int j = 0; j <= limiteLines; j++) {
                    Row line = feuille.getRow(j);
                    if (line == null) {
                        continue;
                    }
                    List<String> values = new ArrayList<>();
                    int last = Math.min(line.getLastCellNum(), 50);
                    for (int k = 0; k < last; k++) {
                        Cell cellule = line.getCell(k);
                        values.add(cellule == null ? "" : formatter.formatCellValue(cellule));
                    }
                    if (values.stream().anyMatch(v -> !v.isBlank())) {
                        text.append(String.join(" | ", values)).append('\n');
                    }
                }
            }
            return tronquer(text.toString());
        }
    }

    public String tronquer(String text) {
        if (text == null) {
            return "";
        }
        String propre = text.replaceAll("[\\t\\r]+", " ").replaceAll(" {2,}", " ").trim();
        if (propre.length() <= LONGUEUR_MAX) {
            return propre;
        }
        int debut = LONGUEUR_MAX / 2;
        int fin = LONGUEUR_MAX - debut;
        return propre.substring(0, debut) + "\n[…]\n" + propre.substring(propre.length() - fin);
    }

    public record Extraction(String text, List<String> imagesBase64, boolean imageSeule, int pageCount) {
    }
}
