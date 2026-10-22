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

    public byte[] renderHtmlToPdf(String html) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.useFont(fontSupplier("/fonts/DejaVuSans.ttf"), "DejaVu Sans");
            builder.useFont(fontSupplier("/fonts/DejaVuSans-Bold.ttf"), "DejaVu Sans", 700, FontStyle.NORMAL, true);
            builder.withHtmlContent(normalizeXhtml(html), null);
            builder.toStream(output);
            builder.run();
            return output.toByteArray();
        } catch (IOException | RuntimeException ex) {
            throw new IllegalStateException("Impossible de générer le PDF : " + ex.getMessage(), ex);
        }
    }

    public byte[] addWatermark(byte[] pdf) {
        try (PDDocument document = PDDocument.load(pdf)) {
            PDType1Font font = PDType1Font.HELVETICA_BOLD;
            for (PDPage page : document.getPages()) {
                PDRectangle size = page.getMediaBox();
                String text = "APERÇU";
                float fontSize = 92f;
                float textWidth = font.getStringWidth(text) / 1000f * fontSize;
                float x = (size.getWidth() - textWidth * 0.707f) / 2f;
                float y = (size.getHeight() - textWidth * 0.707f) / 2f;
                PDExtendedGraphicsState state = new PDExtendedGraphicsState();
                state.setNonStrokingAlphaConstant(0.13f);
                try (PDPageContentStream content = new PDPageContentStream(
                        document, page, AppendMode.APPEND, true, true)) {
                    content.setGraphicsStateParameters(state);
                    content.setNonStrokingColor(new Color(120, 120, 120));
                    content.beginText();
                    content.setFont(font, fontSize);
                    content.setTextMatrix(Matrix.getRotateInstance(Math.toRadians(45), x, y));
                    content.showText(text);
                    content.endText();
                }
            }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            document.save(output);
            return output.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible d'appliquer le filigrane.", ex);
        }
    }

    public byte[] merge(List<byte[]> pdfs) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDFMergerUtility merger = new PDFMergerUtility();
            merger.setDestinationStream(output);
            for (byte[] pdf : pdfs) {
                if (pdf != null && pdf.length > 0) {
                    merger.addSource(new ByteArrayInputStream(pdf));
                }
            }
            merger.mergeDocuments(MemoryUsageSetting.setupMainMemoryOnly());
            return output.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de fusionner les PDF.", ex);
        }
    }

    public byte[] imageToPdf(byte[] image, String name) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDImageXObject imagePdf = PDImageXObject.createFromByteArray(document, image, name);
            float margin = 36f;
            float maxWidth = page.getMediaBox().getWidth() - 2 * margin;
            float maxHeight = page.getMediaBox().getHeight() - 2 * margin;
            float ratio = Math.min(maxWidth / imagePdf.getWidth(), maxHeight / imagePdf.getHeight());
            float width = imagePdf.getWidth() * ratio;
            float height = imagePdf.getHeight() * ratio;
            float x = (page.getMediaBox().getWidth() - width) / 2f;
            float y = (page.getMediaBox().getHeight() - height) / 2f;
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.drawImage(imagePdf, x, y, width, height);
            }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            document.save(output);
            return output.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de convertir l'image en PDF.", ex);
        }
    }

    public byte[] pageText(String title, String text) {
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
                """.formatted(contentTitle(title), content);
        return renderHtmlToPdf(html);
    }

    public boolean isPdf(byte[] content) {
        return content != null && content.length >= 5
                && content[0] == '%' && content[1] == 'P' && content[2] == 'D' && content[3] == 'F';
    }

    private String contentTitle(String title) {
        return title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private FSSupplier<InputStream> fontSupplier(String resource) {
        return () -> PdfService.class.getResourceAsStream(resource);
    }

    private String normalizeXhtml(String html) {
        Document document = Jsoup.parse(html == null ? "" : html);
        document.outputSettings()
                .syntax(Document.OutputSettings.Syntax.xml)
                .charset(StandardCharsets.UTF_8)
                .prettyPrint(false);
        return document.outerHtml();
    }
}
