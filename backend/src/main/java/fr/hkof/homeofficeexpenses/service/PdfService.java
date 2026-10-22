package fr.hkof.homeofficeexpenses.service;

import java.awt.Color;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.apache.pdfbox.io.MemoryUsageSetting;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.PDPageContentStream.AppendMode;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.apache.pdfbox.util.Matrix;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

import com.openhtmltopdf.extend.FSSupplier;
import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

@Service
public class PdfService {

    public byte[] rendreHtmlEnPdf(String html) {
        try (ByteArrayOutputStream sortie = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.useFont(fontSupplier("/fonts/DejaVuSans.ttf"), "DejaVu Sans");
            builder.useFont(fontSupplier("/fonts/DejaVuSans-Bold.ttf"), "DejaVu Sans", 700, FontStyle.NORMAL, true);
            builder.withHtmlContent(normaliserXhtml(html), null);
            builder.toStream(sortie);
            builder.run();
            return sortie.toByteArray();
        } catch (IOException | RuntimeException ex) {
            throw new IllegalStateException("Impossible de générer le PDF : " + ex.getMessage(), ex);
        }
    }

    public byte[] addWatermark(byte[] pdf) {
        try (PDDocument document = PDDocument.load(pdf)) {
            PDType1Font police = PDType1Font.HELVETICA_BOLD;
            for (PDPage page : document.getPages()) {
                PDRectangle size = page.getMediaBox();
                String text = "APERÇU";
                float sizePolice = 92f;
                float largeurText = police.getStringWidth(text) / 1000f * sizePolice;
                float x = (size.getWidth() - largeurText * 0.707f) / 2f;
                float y = (size.getHeight() - largeurText * 0.707f) / 2f;
                PDExtendedGraphicsState state = new PDExtendedGraphicsState();
                state.setNonStrokingAlphaConstant(0.13f);
                try (PDPageContentStream content = new PDPageContentStream(
                        document, page, AppendMode.APPEND, true, true)) {
                    content.setGraphicsStateParameters(state);
                    content.setNonStrokingColor(new Color(120, 120, 120));
                    content.beginText();
                    content.setFont(police, sizePolice);
                    content.setTextMatrix(Matrix.getRotateInstance(Math.toRadians(45), x, y));
                    content.showText(text);
                    content.endText();
                }
            }
            ByteArrayOutputStream sortie = new ByteArrayOutputStream();
            document.save(sortie);
            return sortie.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible d'appliquer le filigrane.", ex);
        }
    }

    public byte[] fusionner(List<byte[]> pdfs) {
        try (ByteArrayOutputStream sortie = new ByteArrayOutputStream()) {
            PDFMergerUtility merger = new PDFMergerUtility();
            merger.setDestinationStream(sortie);
            for (byte[] pdf : pdfs) {
                if (pdf != null && pdf.length > 0) {
                    merger.addSource(new ByteArrayInputStream(pdf));
                }
            }
            merger.mergeDocuments(MemoryUsageSetting.setupMainMemoryOnly());
            return sortie.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de fusionner les PDF.", ex);
        }
    }

    public byte[] imageVersPdf(byte[] image, String name) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDImageXObject imagePdf = PDImageXObject.createFromByteArray(document, image, name);
            float marge = 36f;
            float largeurMax = page.getMediaBox().getWidth() - 2 * marge;
            float hauteurMax = page.getMediaBox().getHeight() - 2 * marge;
            float ratio = Math.min(largeurMax / imagePdf.getWidth(), hauteurMax / imagePdf.getHeight());
            float largeur = imagePdf.getWidth() * ratio;
            float hauteur = imagePdf.getHeight() * ratio;
            float x = (page.getMediaBox().getWidth() - largeur) / 2f;
            float y = (page.getMediaBox().getHeight() - hauteur) / 2f;
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.drawImage(imagePdf, x, y, largeur, hauteur);
            }
            ByteArrayOutputStream sortie = new ByteArrayOutputStream();
            document.save(sortie);
            return sortie.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de convertir l'image en PDF.", ex);
        }
    }

    public byte[] pageText(String titre, String text) {
        String content = (text == null ? "" : text)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
        String html = """
                <!DOCTYPE html>
                <html lang="fr">
                <head><meta charset="utf-8"><style>
                @page { size: A4; margin: 16mm; }
                body { font-family: 'DejaVu Sans'; font-size: 9pt; color: #1f2937; }
                h1 { font-size: 14pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
                pre { white-space: pre-wrap; word-wrap: break-word; font-family: 'DejaVu Sans'; font-size: 8.5pt; }
                </style></head>
                <body><h1>%s</h1><pre>%s</pre></body>
                </html>
                """.formatted(contentTitre(titre), content);
        return rendreHtmlEnPdf(html);
    }

    public boolean estPdf(byte[] content) {
        return content != null && content.length >= 5
                && content[0] == '%' && content[1] == 'P' && content[2] == 'D' && content[3] == 'F';
    }

    private String contentTitre(String titre) {
        return titre.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private FSSupplier<InputStream> fontSupplier(String ressource) {
        return () -> PdfService.class.getResourceAsStream(ressource);
    }

    private String normaliserXhtml(String html) {
        Document document = Jsoup.parse(html == null ? "" : html);
        document.outputSettings()
                .syntax(Document.OutputSettings.Syntax.xml)
                .charset(StandardCharsets.UTF_8)
                .prettyPrint(false);
        return document.outerHtml();
    }
}
