package fr.hkof.homeofficeexpenses.service.extraction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import fr.hkof.homeofficeexpenses.service.BusinessException;

class DocumentTextExtractorEdgeCasesTest {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    @TempDir
    Path tempDir;

    private final DocumentTextExtractor extractor = new DocumentTextExtractor("", TIMEOUT, false,
            new OcrTextExtractor("unused", "fra", TIMEOUT));

    private Path file(String name, byte[] content) throws IOException {
        Path path = tempDir.resolve(name);
        Files.write(path, content);
        return path;
    }

    @Test
    @DisplayName("CSV, text and unknown MIME types are read as plain text")
    void plainTextFormats() throws IOException {
        Path csv = file("facture.csv", "gaz;78,00".getBytes(StandardCharsets.UTF_8));
        assertThat(extractor.extract(csv, "text/csv", 1).text()).contains("gaz;78,00");
        assertThat(extractor.extract(csv, null, 1).text()).contains("gaz;78,00");

        Path txt = file("facture.txt", "EDF gaz".getBytes(StandardCharsets.UTF_8));
        assertThat(extractor.extract(txt, "text/plain", 1).text()).isEqualTo("EDF gaz");
        assertThat(extractor.extract(txt, "", 1).text()).isEqualTo("EDF gaz");
    }

    @Test
    @DisplayName("A docx file is flattened to text")
    void docx() throws IOException {
        Path docx = file("facture.docx", docx("Facture EDF", "Total TTC 78,00"));
        DocumentTextExtractor.Extraction extraction = extractor.extract(docx, null, 1);

        assertThat(extraction.text()).contains("Facture EDF", "Total TTC 78,00");
        assertThat(extraction.imageOnly()).isFalse();
    }

    @Test
    @DisplayName("XLSX and XLS spreadsheets are flattened to text")
    void spreadsheets() throws IOException {
        Path xlsx = file("facture.xlsx", workbook(new XSSFWorkbook()));
        assertThat(extractor.extract(xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 1)
                .text()).contains("Feuille", "Gaz", "78");

        Path xls = file("facture.xls", workbook(new HSSFWorkbook()));
        assertThat(extractor.extract(xls, "application/vnd.ms-excel", 1).text())
                .contains("Feuille", "Gaz", "78");
    }

    @Test
    @DisplayName("An image is returned as a base64 vision input")
    void image() throws IOException {
        byte[] png = new byte[]{(byte) 0x89, 'P', 'N', 'G'};
        DocumentTextExtractor.Extraction extraction = extractor.extract(file("scan.png", png), "image/png", 2);

        assertThat(extraction.imageOnly()).isTrue();
        assertThat(extraction.pageCount()).isEqualTo(1);
        assertThat(extraction.imagesBase64()).hasSize(1);
        assertThat(extraction.text()).isEmpty();
    }

    @Test
    @DisplayName("An unsupported format is rejected in French")
    void unsupported() throws IOException {
        Path path = file("archive.zip", new byte[]{1, 2});
        assertThatThrownBy(() -> extractor.extract(path, "application/zip", 1))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Format de document non pris en charge pour l'analyse.");
        assertThatThrownBy(() -> extractor.extract(path, "application/pdf", 1))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Impossible de lire le document");
    }

    @Test
    @DisplayName("A missing file is rejected in French")
    void missingFile() {
        assertThatThrownBy(() -> extractor.extract(tempDir.resolve("absent.txt"), "text/plain", 1))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Impossible de lire le document");
    }

    @Test
    @DisplayName("A PDF is detected from its extension even without a MIME type")
    void pdfByExtension() throws Exception {
        Path pdf = tempDir.resolve("facture.PDF");
        try (org.apache.pdfbox.pdmodel.PDDocument document = new org.apache.pdfbox.pdmodel.PDDocument()) {
            org.apache.pdfbox.pdmodel.PDPage page = new org.apache.pdfbox.pdmodel.PDPage();
            document.addPage(page);
            try (var content = new org.apache.pdfbox.pdmodel.PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(org.apache.pdfbox.pdmodel.font.PDType1Font.HELVETICA, 12);
                content.newLineAtOffset(50, 700);
                content.showText("Montant TTC : 120,00 euros");
                content.endText();
            }
            document.save(pdf.toFile());
        }

        assertThat(extractor.extract(pdf, null, 1).text()).contains("120,00");
    }

    private byte[] docx(String... paragraphs) throws IOException {
        try (XWPFDocument document = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            for (String text : paragraphs) {
                XWPFParagraph paragraph = document.createParagraph();
                paragraph.createRun().setText(text);
            }
            document.write(out);
            return out.toByteArray();
        }
    }

    private byte[] workbook(org.apache.poi.ss.usermodel.Workbook workbook) throws IOException {
        try (workbook; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Facture");
            Row row = sheet.createRow(0);
            row.createCell(0).setCellValue("Gaz");
            row.createCell(1).setCellValue("78");
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
