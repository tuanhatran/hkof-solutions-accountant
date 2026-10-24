package fr.hkof.homeofficeexpenses.service.extraction;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Duration;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class PdfDocumentReaderEdgeCasesTest {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    @TempDir
    Path tempDir;

    private DocumentTextExtractor extractor(String pdftextCommand) {
        return new DocumentTextExtractor(pdftextCommand, TIMEOUT, false,
                new OcrTextExtractor("unused", "fra", TIMEOUT));
    }

    @Test
    @DisplayName("A blank pdftotext command falls back to the PDFBox text layer")
    void blankCommand() throws IOException {
        DocumentTextExtractor.Extraction extraction = extractor("  ").extract(textPdf("Montant TTC : 120,00 euros"),
                "application/pdf", 1);

        assertThat(extraction.text()).contains("Montant TTC", "120,00");
        assertThat(extraction.imageOnly()).isFalse();
    }

    @Test
    @DisplayName("A pdftotext output shorter than the minimum falls back to PDFBox")
    void shortPdftextOutput() throws IOException {
        Path script = tempDir.resolve("short.sh");
        Files.writeString(script, "#!/bin/sh\nprintf '%s\\n' \"court\"\n");
        Files.setPosixFilePermissions(script, PosixFilePermissions.fromString("rwx------"));

        DocumentTextExtractor.Extraction extraction = extractor(script.toString())
                .extract(textPdf("Montant TTC : 120,00 euros"), "application/pdf", 1);

        assertThat(extraction.text()).contains("120,00");
    }

    @Test
    @DisplayName("The vision path always renders at least one page")
    void visionPathRendersAtLeastOnePage() throws IOException {
        DocumentTextExtractor.Extraction extraction = extractor("").extract(blankPdf(), "application/pdf", 0);

        assertThat(extraction.imageOnly()).isTrue();
        assertThat(extraction.imagesBase64()).hasSize(1);
        assertThat(extraction.pageCount()).isEqualTo(1);
    }

    private Path textPdf(String line) throws IOException {
        Path pdf = tempDir.resolve("text.pdf");
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(PDType1Font.HELVETICA, 12);
                content.newLineAtOffset(50, 700);
                content.showText(line);
                content.endText();
            }
            document.save(pdf.toFile());
        }
        return pdf;
    }

    private Path blankPdf() throws IOException {
        Path pdf = tempDir.resolve("blank.pdf");
        try (PDDocument document = new PDDocument()) {
            document.addPage(new PDPage(PDRectangle.A4));
            document.save(pdf.toFile());
        }
        return pdf;
    }
}
