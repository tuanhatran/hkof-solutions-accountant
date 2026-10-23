package fr.hkof.homeofficeexpenses.service.extraction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class DocumentTextExtractorTest {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    @TempDir
    Path tempDir;

    @Test
    @DisplayName("Uses the configured pdftotext command and keeps inner spaces")
    void usesPdftextAndKeepsLayout() throws Exception {
        Path fake = executable("""
                #!/bin/sh
                printf '%s\\n' "total auprès du fournisseur 41,66  49,99"
                """);
        DocumentTextExtractor extractor = extractor(fake, false, "unused");
        Path pdf = textPdf("Montant TTC : 120,00");

        DocumentTextExtractor.Extraction extraction = extractor.extract(pdf, "application/pdf", 3);

        assertThat(extraction.text()).isEqualTo("total auprès du fournisseur 41,66  49,99");
        assertThat(extraction.text()).contains("41,66  49,99");
        assertThat(extraction.imageOnly()).isFalse();
        assertThat(extraction.imagesBase64()).isEmpty();
    }

    @Test
    @DisplayName("Falls back to PDFBox when pdftotext exits with an error")
    void fallsBackOnErrorExit() throws Exception {
        Path fake = executable("""
                #!/bin/sh
                exit 2
                """);
        DocumentTextExtractor extractor = extractor(fake, false, "unused");
        Path pdf = textPdf("Montant TTC : 120,00 euros");

        DocumentTextExtractor.Extraction extraction = extractor.extract(pdf, "application/pdf", 3);

        assertThat(extraction.text()).contains("Montant TTC");
        assertThat(extraction.text()).contains("120,00");
        assertThat(extraction.imageOnly()).isFalse();
    }

    @Test
    @DisplayName("Falls back to PDFBox when the pdftotext binary is missing")
    void fallsBackOnMissingBinary() throws Exception {
        DocumentTextExtractor extractor = extractor(Path.of("/nonexistent/pdftotext"), false, "unused");
        Path pdf = textPdf("Montant TTC : 120,00 euros");

        DocumentTextExtractor.Extraction extraction = extractor.extract(pdf, "application/pdf", 3);

        assertThat(extraction.text()).contains("120,00");
        assertThat(extraction.imageOnly()).isFalse();
    }

    @Test
    @DisplayName("Falls back to PDFBox when pdftotext times out")
    void fallsBackOnTimeout() throws Exception {
        Path fake = executable("""
                #!/bin/sh
                sleep 5
                """);
        DocumentTextExtractor extractor = new DocumentTextExtractor(fake.toString(), Duration.ofMillis(100), false,
                new OcrTextExtractor("unused", "fra", TIMEOUT));
        Path pdf = textPdf("Montant TTC : 120,00 euros");

        DocumentTextExtractor.Extraction extraction = extractor.extract(pdf, "application/pdf", 3);

        assertThat(extraction.text()).contains("120,00");
        assertThat(extraction.imageOnly()).isFalse();
    }

    @Test
    @DisplayName("Uses OCR text when the PDF has no text layer")
    void usesOcrForImageOnlyPdf() throws Exception {
        Path fakeOcr = executable("""
                #!/bin/sh
                printf '%s\\n' 'Facture Fibre Exemple Total TTC 49,99'
                """);
        DocumentTextExtractor extractor = extractor(
                Path.of("/nonexistent/pdftotext"), true, fakeOcr.toString());
        Path pdf = imageOnlyPdf();

        DocumentTextExtractor.Extraction extraction = extractor.extract(pdf, "application/pdf", 3);

        assertThat(extraction.text()).contains("Total TTC 49,99");
        assertThat(extraction.imageOnly()).isFalse();
        assertThat(extraction.imagesBase64()).isEmpty();
    }

    @Test
    @DisplayName("Keeps the vision image path when OCR is disabled")
    void keepsVisionImagesWhenOcrDisabled() throws Exception {
        Path fakeOcr = executable("""
                #!/bin/sh
                printf '%s\\n' 'Total TTC 49,99'
                """);
        DocumentTextExtractor extractor = extractor(
                Path.of("/nonexistent/pdftotext"), false, fakeOcr.toString());
        Path pdf = imageOnlyPdf();

        DocumentTextExtractor.Extraction extraction = extractor.extract(pdf, "application/pdf", 3);

        assertThat(extraction.text()).isEmpty();
        assertThat(extraction.imageOnly()).isTrue();
        assertThat(extraction.imagesBase64()).isNotEmpty();
    }

    @Test
    @DisplayName("Keeps the vision image path when OCR returns too little text")
    void keepsVisionImagesWhenOcrReturnsNothing() throws Exception {
        Path failingOcr = executable("""
                #!/bin/sh
                exit 1
                """);
        DocumentTextExtractor extractor = extractor(
                Path.of("/nonexistent/pdftotext"), true, failingOcr.toString());
        Path pdf = imageOnlyPdf();

        DocumentTextExtractor.Extraction extraction = extractor.extract(pdf, "application/pdf", 3);

        assertThat(extraction.text()).isEmpty();
        assertThat(extraction.imageOnly()).isTrue();
        assertThat(extraction.imagesBase64()).isNotEmpty();
    }

    @Test
    @DisplayName("Real pdftotext keeps two amounts on the same line")
    void realPdftextKeepsColumns() throws Exception {
        assumeTrue(realCommandAvailable("pdftotext"));
        DocumentTextExtractor extractor = extractor(Path.of("pdftotext"), false, "unused");
        Path pdf = textPdf("Total 41,66 49,99");

        DocumentTextExtractor.Extraction extraction = extractor.extract(pdf, "application/pdf", 3);

        assertThat(extraction.text().lines()
                .anyMatch(line -> line.contains("41,66") && line.contains("49,99"))).isTrue();
    }

    private DocumentTextExtractor extractor(Path pdftextCommand, boolean ocrEnabled, String ocrCommand) {
        return new DocumentTextExtractor(pdftextCommand.toString(), TIMEOUT, ocrEnabled,
                new OcrTextExtractor(ocrCommand, "fra", TIMEOUT));
    }

    private Path textPdf(String line) throws IOException {
        Path pdf = tempDir.resolve("text-" + System.nanoTime() + ".pdf");
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

    private Path imageOnlyPdf() throws IOException {
        Path pdf = tempDir.resolve("image-" + System.nanoTime() + ".pdf");
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.addRect(50, 500, 400, 100);
                content.fill();
            }
            document.save(pdf.toFile());
        }
        return pdf;
    }

    private Path executable(String content) throws IOException {
        Path script = tempDir.resolve("fake-" + System.nanoTime() + ".sh");
        Files.writeString(script, content);
        Files.setPosixFilePermissions(script, PosixFilePermissions.fromString("rwx------"));
        return script;
    }

    private static boolean realCommandAvailable(String command) {
        try {
            Process process = new ProcessBuilder(command, "-v")
                    .redirectErrorStream(true)
                    .start();
            return process.waitFor(5, TimeUnit.SECONDS) && process.exitValue() == 0;
        } catch (IOException ex) {
            return false;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return false;
        }
    }
}
