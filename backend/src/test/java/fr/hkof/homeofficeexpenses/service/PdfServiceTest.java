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
    @DisplayName("Rend du HTML en PDF avec les polices, accents et montants français")
    void renduHtml() throws Exception {
        byte[] pdf = pdfService.rendreHtmlEnPdf("""
                <!DOCTYPE html>
                <html lang="fr"><head><meta charset="utf-8"><style>
                  body { font-family: 'DejaVu Sans'; }
                  h1 { font-size: 16pt; }
                </style></head>
                <body><h1>QUITTANCE DE LÖYER</h1><p>Total : 1 234,56 € — Électricité</p></body></html>
                """);

        assertThat(pdfService.estPdf(pdf)).isTrue();
        String texte = texte(pdf);
        assertThat(texte).contains("QUITTANCE", "1 234,56", "Électricité");
    }

    @Test
    @DisplayName("Appose le filigrane APERÇU sur chaque page")
    void filigrane() throws Exception {
        byte[] pdf = pdfService.rendreHtmlEnPdf("<html><body><p>Document</p></body></html>");
        byte[] filigrane = pdfService.ajouterFiligrane(pdf);

        assertThat(texte(filigrane)).contains("APERÇU");
    }

    @Test
    @DisplayName("Convertit une image en page A4 et fusionne les PDF")
    void imageEtFusion() throws Exception {
        BufferedImage image = new BufferedImage(200, 100, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphique = image.createGraphics();
        graphique.setColor(Color.WHITE);
        graphique.fillRect(0, 0, 200, 100);
        graphique.setColor(Color.BLACK);
        graphique.drawString("Justificatif", 20, 50);
        graphique.dispose();
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(image, "png", png);

        byte[] imagePdf = pdfService.imageVersPdf(png.toByteArray(), "justificatif.png");
        byte[] note = pdfService.rendreHtmlEnPdf("<html><body><p>Note de frais</p></body></html>");
        byte[] fusion = pdfService.fusionner(List.of(note, imagePdf));

        try (PDDocument document = PDDocument.load(fusion)) {
            assertThat(document.getNumberOfPages()).isEqualTo(2);
        }
    }

    @Test
    @DisplayName("Rend une page texte avec du contenu échappé")
    void pageTexte() throws Exception {
        byte[] pdf = pdfService.pageTexte("Annexe <test>", "Ligne 1 & ligne 2\nAccents : éàçù");
        assertThat(texte(pdf)).contains("Annexe", "Ligne 1", "Accents");
    }

    private String texte(byte[] pdf) throws Exception {
        try (PDDocument document = PDDocument.load(pdf)) {
            return new PDFTextStripper().getText(document);
        }
    }
}
