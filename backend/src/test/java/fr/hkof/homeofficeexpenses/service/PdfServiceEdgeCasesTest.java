package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PdfServiceEdgeCasesTest {

    private final PdfService pdfService = new PdfService();

    @Test
    @DisplayName("isPdf rejects null, short and non PDF content")
    void isPdf() {
        assertThat(pdfService.isPdf(null)).isFalse();
        assertThat(pdfService.isPdf(new byte[]{'%', 'P'})).isFalse();
        assertThat(pdfService.isPdf("hello".getBytes(StandardCharsets.UTF_8))).isFalse();
        assertThat(pdfService.isPdf("%PDF-1.7".getBytes(StandardCharsets.UTF_8))).isTrue();
    }

    @Test
    @DisplayName("A text page accepts null content")
    void pageTextNulls() throws Exception {
        byte[] pdf = pdfService.pageText("Titre", null);
        assertThat(pdfService.isPdf(pdf)).isTrue();
    }

    @Test
    @DisplayName("Rendering an empty document still produces a PDF")
    void renderNullHtml() {
        assertThat(pdfService.isPdf(pdfService.renderHtmlToPdf(null))).isTrue();
    }

    @Test
    @DisplayName("Merging no usable source returns an empty stream")
    void mergeEmpty() {
        assertThat(pdfService.merge(java.util.List.of())).isEmpty();
        assertThat(pdfService.merge(java.util.List.of(new byte[0], new byte[0]))).isEmpty();
    }

    @Test
    @DisplayName("Invalid PDF and image inputs fail with a French message")
    void invalidInputs() {
        assertThatThrownBy(() -> pdfService.addWatermark("not a pdf".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("filigrane");
        assertThatThrownBy(() -> pdfService.merge(java.util.List.of("not a pdf".getBytes(StandardCharsets.UTF_8))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("fusionner");
        assertThatThrownBy(() -> pdfService.imageToPdf("not an image".getBytes(StandardCharsets.UTF_8), "x.png"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("A generated PDF is a byte stream")
    void outputStream() {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(pdfService.pageText("Titre", "texte"));
        assertThat(out.size()).isGreaterThan(0);
    }
}
