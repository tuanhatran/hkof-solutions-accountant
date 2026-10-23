package fr.hkof.homeofficeexpenses.service.template;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.geom.Path2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.imageio.ImageIO;

import org.apache.pdfbox.contentstream.PDFStreamEngine;
import org.apache.pdfbox.contentstream.operator.Operator;
import org.apache.pdfbox.cos.COSBase;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.util.Matrix;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import com.samskivert.mustache.Mustache;

import fr.hkof.homeofficeexpenses.service.PdfService;

class BundledTemplateSignatureTest {

    /** Current minimum readable width for a wide signature. */
    private static final double MIN_READABLE_WIDTH_PT = 150 * 0.75d;
    private static final double TOLERANCE_PT = 1d;

    private static final List<String> TEMPLATES = List.of(
            "templates/defaut/quittance.html",
            "templates/defaut/note-frais.html");

    private String resourceText(String path) throws IOException {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private byte[] resourceBytes(String path) throws IOException {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return in.readAllBytes();
        }
    }

    @Test
    @DisplayName("Built-in templates use the {{signature}} variable and embed no base64 literal")
    void builtInTemplatesUseSignatureVariable() throws IOException {
        for (String path : TEMPLATES) {
            String template = resourceText(path);
            assertThat(template).as(path).contains("src=\"{{signature}}\"");
            assertThat(template).as(path).doesNotContain("data:image/png;base64");
        }
    }

    @Test
    @DisplayName("A configured signature rasterizes into the rendered quittance PDF")
    void quittanceSignatureRasterizesInPdf() throws IOException {
        byte[] signaturePng = resourceBytes("templates/Signature_Bailleur.png");
        String dataUri = "data:image/png;base64," + Base64.getEncoder().encodeToString(signaturePng);
        String html = Mustache.compiler()
                .defaultValue("")
                .escapeHTML(true)
                .compile(resourceText("templates/defaut/quittance.html"))
                .execute(Map.of("signature", dataUri));
        byte[] pdf = new PdfService().renderHtmlToPdf(html);

        try (PDDocument document = PDDocument.load(pdf)) {
            PDPage page = document.getPage(0);
            boolean hasImage = false;
            for (COSName name : page.getResources().getXObjectNames()) {
                PDXObject xObject = page.getResources().getXObject(name);
                if (xObject instanceof PDImageXObject) {
                    hasImage = true;
                    break;
                }
            }
            assertThat(hasImage).as("quittance PDF page 1 contains a rasterized image").isTrue();
        }
    }

    @Test
    @DisplayName("Note de frais frame is at least 300x170 px and caps the signature image")
    void noteFraisCadreIsLargeEnough() throws IOException {
        String template = resourceText("templates/defaut/note-frais.html");
        String cadre = cssRule(template, "\\.cadre");
        assertThat(pixelValue(cadre, "width")).as(".cadre width").isGreaterThanOrEqualTo(300);
        assertThat(pixelValue(cadre, "height")).as(".cadre height").isGreaterThanOrEqualTo(170);

        String imageRule = cssRule(template, "\\.cadre\\s+img");
        assertThat(imageRule).as(".cadre img rule").contains("max-width: 100%");
        assertThat(imageRule).as(".cadre img rule").contains("max-height");
        assertThat(template).contains("Signature du gérant");
    }

    @Test
    @DisplayName("Wide and tall signatures stay inside the note de frais frame")
    void noteFraisSignaturesStayInsideCadre() throws IOException {
        String template = resourceText("templates/defaut/note-frais.html");
        String cadre = cssRule(template, "\\.cadre");
        double contentWidthPt = frameContent(cadre, "width") * 0.75d;
        double contentHeightPt = frameContent(cadre, "height") * 0.75d;

        for (boolean wide : new boolean[] {true, false}) {
            String label = wide ? "wide" : "tall";
            BufferedImage signature = wide ? syntheticSignaturePng(900, 200) : syntheticSignaturePng(200, 900);
            String dataUri = "data:image/png;base64," + Base64.getEncoder().encodeToString(toPng(signature));
            String html = Mustache.compiler()
                    .defaultValue("")
                    .escapeHTML(true)
                    .compile(template)
                    .execute(Map.of("signature", dataUri));

            byte[] pdf = new PdfService().renderHtmlToPdf(html);
            try (PDDocument document = PDDocument.load(pdf)) {
                assertThat(document.getNumberOfPages()).as(label + " signature: one page").isEqualTo(1);

                ImagePlacementCollector collector = new ImagePlacementCollector();
                collector.processPage(document.getPage(0));
                assertThat(collector.placements).as(label + " signature: rasterized image").hasSize(1);

                PDRectangle placed = collector.placements.get(0);
                assertThat((double) placed.getWidth())
                        .as(label + " signature: width fits frame content")
                        .isLessThanOrEqualTo(contentWidthPt + TOLERANCE_PT);
                assertThat((double) placed.getHeight())
                        .as(label + " signature: height fits frame content")
                        .isLessThanOrEqualTo(contentHeightPt + TOLERANCE_PT);
                if (wide) {
                    assertThat((double) placed.getWidth())
                            .as("wide signature stays readable")
                            .isGreaterThanOrEqualTo(MIN_READABLE_WIDTH_PT - TOLERANCE_PT);
                }

                String text = new PDFTextStripper().getText(document);
                assertThat(text).as("non-blank page with French label")
                        .contains("Signature du gérant")
                        .contains("NOTE DE FRAIS D'OCCUPATION");
            }
        }
    }

    private String cssRule(String template, String selectorRegex) {
        Matcher matcher = Pattern.compile(selectorRegex + "\\s*\\{([^}]*)\\}").matcher(template);
        assertThat(matcher.find()).as("CSS rule %s exists", selectorRegex).isTrue();
        return matcher.group(1);
    }

    private int frameContent(String declarations, String dimension) {
        return pixelValue(declarations, dimension)
                - 2 * pixelValue(declarations, "border")
                - 2 * pixelValue(declarations, "padding");
    }

    private int pixelValue(String declarations, String property) {
        Matcher matcher = Pattern.compile(property + "\\s*:\\s*(\\d+)px").matcher(declarations);
        assertThat(matcher.find()).as("CSS %s in px", property).isTrue();
        return Integer.parseInt(matcher.group(1));
    }

    private BufferedImage syntheticSignaturePng(int width, int height) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setColor(Color.BLACK);
            graphics.setStroke(new BasicStroke(Math.max(2f, width / 80f), BasicStroke.CAP_ROUND,
                    BasicStroke.JOIN_ROUND));
            Path2D path = new Path2D.Float();
            path.moveTo(width * 0.08, height * 0.72);
            path.curveTo(width * 0.22, height * 0.12, width * 0.38, height * 0.94, width * 0.52, height * 0.34);
            path.curveTo(width * 0.62, height * 0.02, width * 0.74, height * 0.86, width * 0.92, height * 0.22);
            graphics.draw(path);
        } finally {
            graphics.dispose();
        }
        return image;
    }

    private byte[] toPng(BufferedImage image) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }

    /** Records the user-space rectangle of every rasterized image drawn on a page. */
    private static final class ImagePlacementCollector extends PDFStreamEngine {

        private final List<PDRectangle> placements = new ArrayList<>();

        ImagePlacementCollector() {
            addOperator(new org.apache.pdfbox.contentstream.operator.state.Save());
            addOperator(new org.apache.pdfbox.contentstream.operator.state.Restore());
            addOperator(new org.apache.pdfbox.contentstream.operator.state.Concatenate());
        }

        @Override
        public void processOperator(Operator operator, List<COSBase> operands) throws IOException {
            if ("Do".equals(operator.getName())) {
                PDXObject xObject = getResources().getXObject((COSName) operands.get(0));
                if (xObject instanceof PDImageXObject) {
                    Matrix matrix = getGraphicsState().getCurrentTransformationMatrix();
                    placements.add(new PDRectangle(matrix.getTranslateX(), matrix.getTranslateY(),
                            matrix.getScalingFactorX(), matrix.getScalingFactorY()));
                }
            }
            super.processOperator(operator, operands);
        }
    }
}
