package fr.hkof.homeofficeexpenses.service.template;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import com.samskivert.mustache.Mustache;

import fr.hkof.homeofficeexpenses.service.PdfService;

class BundledTemplateSignatureTest {

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
}
