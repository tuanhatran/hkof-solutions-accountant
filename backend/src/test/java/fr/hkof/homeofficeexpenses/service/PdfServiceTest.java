package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;

import javax.imageio.ImageIO;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PdfServiceTest {

    private final PdfService pdfService = new PdfService();

    @Test
    @DisplayName("Renders HTML to PDF with fonts, accents and French amounts")
    void rendersHtml() throws Exception {
        byte[] pdf = pdfService.renderHtmlToPdf("""
                <!DOCTYPE html>
                <html lang="fr"><head><meta charset="utf-8"><style>
                  body { font-family: 'DejaVu Sans'; }
                  h1 { font-size: 16pt; }
                </style></head>
                <body><h1>QUITTANCE DE LÖYER</h1><p>Total : 1 234,56 € — Électricité</p></body></html>
                """);

        assertThat(pdfService.isPdf(pdf)).isTrue();
        String text = text(pdf);
        assertThat(text).contains("QUITTANCE", "1 234,56", "Électricité");
    }

    @Test
    @DisplayName("Applies the APERÇU watermark to every page")
    void watermark() throws Exception {
        byte[] pdf = pdfService.renderHtmlToPdf("<html><body><p>Document</p></body></html>");
        byte[] watermark = pdfService.addWatermark(pdf);

        assertThat(text(watermark)).contains("APERÇU");
    }

    @Test
    @DisplayName("Converts an image to an A4 page and merges PDFs")
    void imageAndMerge() throws Exception {
        BufferedImage image = new BufferedImage(200, 100, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphique = image.createGraphics();
        graphique.setColor(Color.WHITE);
        graphique.fillRect(0, 0, 200, 100);
        graphique.setColor(Color.BLACK);
        graphique.drawString("Justificatif", 20, 50);
        graphique.dispose();
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(image, "png", png);

        byte[] imagePdf = pdfService.imageToPdf(png.toByteArray(), "justificatif.png");
        byte[] statement = pdfService.renderHtmlToPdf("<html><body><p>Note de frais</p></body></html>");
        byte[] fusion = pdfService.merge(List.of(statement, imagePdf));

        try (PDDocument document = PDDocument.load(fusion)) {
            assertThat(document.getNumberOfPages()).isEqualTo(2);
        }
    }

    @Test
    @DisplayName("Renders a text page with escaped content")
    void pageText() throws Exception {
        byte[] pdf = pdfService.pageText("Annexe <test>", "Ligne 1 & ligne 2\nAccents : éàçù");
        assertThat(text(pdf)).contains("Annexe", "Ligne 1", "Accents");
    }

    private String text(byte[] pdf) throws Exception {
        try (PDDocument document = PDDocument.load(pdf)) {
            return new PDFTextStripper().getText(document);
        }
    }
}
