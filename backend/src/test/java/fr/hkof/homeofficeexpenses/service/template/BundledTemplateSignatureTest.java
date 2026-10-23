package fr.hkof.homeofficeexpenses.service.template;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    private static final Pattern DATA_URI = Pattern.compile("data:image/png;base64,([A-Za-z0-9+/=]+)");

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

    private byte[] embeddedSignature(String templatePath) throws IOException {
        Matcher matcher = DATA_URI.matcher(resourceText(templatePath));
        assertThat(matcher.find()).as("embedded PNG data URI in %s", templatePath).isTrue();
        return Base64.getDecoder().decode(matcher.group(1));
    }

    @Test
    @DisplayName("Built-in templates embed the committed signature PNG bytes")
    void builtInTemplatesEmbedSignaturePng() throws IOException {
        assertThat(embeddedSignature("templates/defaut/quittance.html"))
                .isEqualTo(resourceBytes("templates/Signature_Bailleur.png"));
        assertThat(embeddedSignature("templates/defaut/note-frais.html"))
                .isEqualTo(resourceBytes("templates/Signature_TRAN.png"));
    }

    @Test
    @DisplayName("The embedded signature rasterizes into the rendered quittance PDF")
    void quittanceSignatureRasterizesInPdf() throws IOException {
        String html = Mustache.compiler()
                .defaultValue("")
                .escapeHTML(true)
                .compile(resourceText("templates/defaut/quittance.html"))
                .execute(Map.of());
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
