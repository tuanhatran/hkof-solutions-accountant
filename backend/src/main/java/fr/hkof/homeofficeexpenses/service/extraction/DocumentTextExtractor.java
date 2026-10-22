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

    public Extraction extraire(Path chemin, String typeMime, int pagesMaxVision) {
        try {
            byte[] contenu = Files.readAllBytes(chemin);
            String mime = typeMime == null ? "" : typeMime;
            if (mime.equals("application/pdf") || chemin.toString().toLowerCase().endsWith(".pdf")) {
                return extrairePdf(contenu, pagesMaxVision);
            }
            if (mime.contains("wordprocessingml") || chemin.toString().toLowerCase().endsWith(".docx")) {
                return texteSeul(extraireDocx(contenu));
            }
            if (mime.contains("spreadsheetml") || mime.equals("application/vnd.ms-excel")
                    || chemin.toString().toLowerCase().endsWith(".xlsx")
                    || chemin.toString().toLowerCase().endsWith(".xls")) {
                return texteSeul(extraireTableur(contenu));
            }
            if (mime.equals("text/csv") || mime.equals("text/plain")
                    || chemin.toString().toLowerCase().endsWith(".csv")
                    || chemin.toString().toLowerCase().endsWith(".txt")) {
                return texteSeul(tronquer(new String(contenu, StandardCharsets.UTF_8)));
            }
            if (mime.startsWith("image/")) {
                return new Extraction("", List.of(Base64.getEncoder().encodeToString(contenu)), true, 1);
            }
            throw new BusinessException("Format de document non pris en charge pour l'analyse.");
        } catch (IOException ex) {
            throw new BusinessException("Impossible de lire le document : " + ex.getMessage());
        }
    }

    private Extraction extrairePdf(byte[] contenu, int pagesMaxVision) throws IOException {
        try (PDDocument document = PDDocument.load(contenu)) {
            int pages = document.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setEndPage(Math.min(pages, PAGES_MAX_TEXTE));
            String texte = stripper.getText(document).trim();
            if (texte.length() >= 20) {
                return texteSeul(tronquer(texte));
            }
            List<String> images = new ArrayList<>();
            PDFRenderer renderer = new PDFRenderer(document);
            int limite = Math.min(pages, Math.max(1, pagesMaxVision));
            for (int i = 0; i < limite; i++) {
                BufferedImage image = renderer.renderImageWithDPI(i, 150, ImageType.RGB);
                ByteArrayOutputStream png = new ByteArrayOutputStream();
                ImageIO.write(image, "png", png);
                images.add(Base64.getEncoder().encodeToString(png.toByteArray()));
            }
            return new Extraction("", images, true, pages);
        }
    }

    private Extraction texteSeul(String texte) {
        return new Extraction(texte, List.of(), false, 0);
    }

    private String extraireDocx(byte[] contenu) throws IOException {
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(contenu))) {
            StringBuilder texte = new StringBuilder();
            for (XWPFParagraph paragraphe : document.getParagraphs()) {
                if (!paragraphe.getText().isBlank()) {
                    texte.append(paragraphe.getText()).append('\n');
                }
            }
            for (XWPFTable table : document.getTables()) {
                for (XWPFTableRow ligne : table.getRows()) {
                    List<String> cellules = new ArrayList<>();
                    for (XWPFTableCell cellule : ligne.getTableCells()) {
                        cellules.add(cellule.getText());
                    }
                    texte.append(String.join(" | ", cellules)).append('\n');
                }
            }
            return tronquer(texte.toString());
        }
    }

    private String extraireTableur(byte[] contenu) throws IOException {
        try (Workbook classeur = WorkbookFactory.create(new ByteArrayInputStream(contenu))) {
            DataFormatter formatter = new DataFormatter(java.util.Locale.FRANCE);
            StringBuilder texte = new StringBuilder();
            for (int i = 0; i < classeur.getNumberOfSheets(); i++) {
                Sheet feuille = classeur.getSheetAt(i);
                texte.append("Feuille : ").append(feuille.getSheetName()).append('\n');
                int limiteLignes = Math.min(feuille.getLastRowNum(), 2000);
                for (int j = 0; j <= limiteLignes; j++) {
                    Row ligne = feuille.getRow(j);
                    if (ligne == null) {
                        continue;
                    }
                    List<String> valeurs = new ArrayList<>();
                    int derniere = Math.min(ligne.getLastCellNum(), 50);
                    for (int k = 0; k < derniere; k++) {
                        Cell cellule = ligne.getCell(k);
                        valeurs.add(cellule == null ? "" : formatter.formatCellValue(cellule));
                    }
                    if (valeurs.stream().anyMatch(v -> !v.isBlank())) {
                        texte.append(String.join(" | ", valeurs)).append('\n');
                    }
                }
            }
            return tronquer(texte.toString());
        }
    }

    public String tronquer(String texte) {
        if (texte == null) {
            return "";
        }
        String propre = texte.replaceAll("[\\t\\r]+", " ").replaceAll(" {2,}", " ").trim();
        if (propre.length() <= LONGUEUR_MAX) {
            return propre;
        }
        int debut = LONGUEUR_MAX / 2;
        int fin = LONGUEUR_MAX - debut;
        return propre.substring(0, debut) + "\n[…]\n" + propre.substring(propre.length() - fin);
    }

    public record Extraction(String texte, List<String> imagesBase64, boolean imageSeule, int nombrePages) {
    }
}
