package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class FileTypeDetectorTest {

    private static final byte[] PDF = "%PDF-1.7\n".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] JPEG = new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0};
    private static final byte[] PNG = new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] XLS = new byte[] {
            (byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1};

    private final FileTypeDetector detector = new FileTypeDetector();

    @Test
    @DisplayName("Detects a PDF by its magic bytes")
    void detectsPdf() {
        FileTypeDetector.DetectedFile file = detector.detectReceipt("quittance.PDF", PDF);

        assertThat(file.fileName()).isEqualTo("quittance.PDF");
        assertThat(file.extension()).isEqualTo("pdf");
        assertThat(file.mimeType()).isEqualTo("application/pdf");
    }

    @Test
    @DisplayName("Detects JPEG and PNG receipts")
    void detectsImages() {
        assertThat(detector.detectReceipt("photo.jpg", JPEG).mimeType()).isEqualTo("image/jpeg");
        assertThat(detector.detectReceipt("photo.jpeg", JPEG).extension()).isEqualTo("jpeg");
        assertThat(detector.detectReceipt("scan.png", PNG).mimeType()).isEqualTo("image/png");
    }

    @Test
    @DisplayName("Detects a DOCX archive containing word/")
    void detectsDocx() throws IOException {
        FileTypeDetector.DetectedFile file = detector.detectReceipt("note.docx", zip("word/document.xml"));

        assertThat(file.mimeType())
                .isEqualTo("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    }

    @Test
    @DisplayName("Detects an XLSX archive containing xl/")
    void detectsXlsx() throws IOException {
        FileTypeDetector.DetectedFile file = detector.detectReceipt("tableau.xlsx", zip("xl/workbook.xml"));

        assertThat(file.mimeType())
                .isEqualTo("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    @Test
    @DisplayName("Detects a legacy XLS workbook by its compound-file signature")
    void detectsXls() {
        assertThat(detector.detectReceipt("ancien.xls", XLS).mimeType()).isEqualTo("application/vnd.ms-excel");
    }

    @Test
    @DisplayName("Accepts plain-text CSV and TXT receipts")
    void detectsText() {
        assertThat(detector.detectReceipt("lignes.csv", "a;b\n1;2\n".getBytes(StandardCharsets.UTF_8)).mimeType())
                .isEqualTo("text/csv");
        assertThat(detector.detectReceipt("notes.txt", "du texte".getBytes(StandardCharsets.UTF_8)).mimeType())
                .isEqualTo("text/plain");
    }

    @Test
    @DisplayName("Rejects an empty receipt")
    void emptyReceipt() {
        assertThatThrownBy(() -> detector.detectReceipt("vide.pdf", new byte[0]))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le fichier est vide.");
        assertThatThrownBy(() -> detector.detectReceipt("vide.pdf", null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le fichier est vide.");
    }

    @Test
    @DisplayName("Rejects a receipt above 10 MB")
    void receiptTooLarge() {
        byte[] tooLarge = new byte[(int) FileTypeDetector.MAX_RECEIPT_SIZE + 1];

        assertThatThrownBy(() -> detector.detectReceipt("gros.pdf", tooLarge))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("maximum 10 Mo");
    }

    @Test
    @DisplayName("Rejects an unsupported extension")
    void unsupportedExtension() {
        assertThatThrownBy(() -> detector.detectReceipt("script.exe", new byte[] {1, 2, 3}))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Format non accepté");
        assertThatThrownBy(() -> detector.detectReceipt("sansextension", PDF))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Format non accepté");
    }

    @Test
    @DisplayName("Rejects content that does not match the extension")
    void contentMismatch() throws IOException {
        assertThatThrownBy(() -> detector.detectReceipt("faux.pdf", "text".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ne correspond pas à son extension");
        assertThatThrownBy(() -> detector.detectReceipt("faux.jpg", PNG))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ne correspond pas");
        assertThatThrownBy(() -> detector.detectReceipt("faux.png", JPEG))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ne correspond pas");
        assertThatThrownBy(() -> detector.detectReceipt("faux.docx", zip("xl/workbook.xml")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ne correspond pas");
        assertThatThrownBy(() -> detector.detectReceipt("faux.xlsx", zip("word/document.xml")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ne correspond pas");
        assertThatThrownBy(() -> detector.detectReceipt("faux.xls", PDF))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ne correspond pas");
    }

    @Test
    @DisplayName("Rejects a binary TXT because of its NUL byte")
    void binaryText() {
        assertThatThrownBy(() -> detector.detectReceipt("binaire.txt", new byte[] {'a', 0, 'b'}))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ne correspond pas");
    }

    @Test
    @DisplayName("Rejects a corrupt ZIP archive")
    void corruptZip() {
        byte[] corrupt = new byte[] {'P', 'K', 3, 4, 1, 2, 3};

        assertThatThrownBy(() -> detector.detectReceipt("casse.docx", corrupt))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ne correspond pas");
        assertThatThrownBy(() -> detector.detectReceipt("court.docx", new byte[] {1, 2, 3}))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ne correspond pas");
        byte[] brokenZip = new byte[] {'P', 'K', 1, 2, 3, 4, 5, 6, 7, 8};
        assertThatThrownBy(() -> detector.detectReceipt("casse.docx", brokenZip))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ne correspond pas");
    }

    @Test
    @DisplayName("Detects a PNG signature image")
    void detectsSignaturePng() {
        FileTypeDetector.DetectedFile file = detector.detectSignature("signature.png", PNG);

        assertThat(file.mimeType()).isEqualTo("image/png");
        assertThat(file.extension()).isEqualTo("png");
    }

    @Test
    @DisplayName("Detects a JPEG signature image")
    void detectsSignatureJpeg() {
        assertThat(detector.detectSignature("signature.JPG", JPEG).mimeType()).isEqualTo("image/jpeg");
    }

    @Test
    @DisplayName("Rejects a null or empty signature payload")
    void rejectsNullSignature() {
        assertThatThrownBy(() -> detector.detectSignature("signature.png", null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le fichier est vide.");
    }

    @Test
    @DisplayName("Rejects an empty or oversized signature")
    void rejectsInvalidSignatureSize() {
        assertThatThrownBy(() -> detector.detectSignature("vide.png", new byte[0]))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le fichier est vide.");
        byte[] tooLarge = new byte[(int) FileTypeDetector.MAX_SIGNATURE_SIZE + 1];
        assertThatThrownBy(() -> detector.detectSignature("gros.png", tooLarge))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("maximum 2 Mo");
    }

    @Test
    @DisplayName("Rejects a signature that is not a PNG or JPEG")
    void rejectsNonImageSignature() {
        assertThatThrownBy(() -> detector.detectSignature("signature.pdf", PDF))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature doit être une image PNG ou JPEG.");
        assertThatThrownBy(() -> detector.detectSignature("signature.png", JPEG))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature doit être une image PNG ou JPEG.");
    }

    @Test
    @DisplayName("Validates an HTML template")
    void validatesTemplateHtml() {
        detector.validateTemplateHtml("modele.html", "<p>Bonjour</p>".getBytes(StandardCharsets.UTF_8));
        detector.validateTemplateHtml("modele.htm", "<p>Bonjour</p>".getBytes(StandardCharsets.UTF_8));
    }

    @Test
    @DisplayName("Rejects an invalid HTML template")
    void rejectsInvalidTemplate() {
        assertThatThrownBy(() -> detector.validateTemplateHtml("modele.html", null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le fichier template est vide.");
        assertThatThrownBy(() -> detector.validateTemplateHtml("modele.html", new byte[0]))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le fichier template est vide.");
        byte[] tooLarge = new byte[(int) FileTypeDetector.MAX_TEMPLATE_SIZE + 1];
        assertThatThrownBy(() -> detector.validateTemplateHtml("modele.html", tooLarge))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("maximum 5 Mo");
        assertThatThrownBy(() -> detector.validateTemplateHtml("modele.docx", PDF))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("fichier HTML");
        assertThatThrownBy(() -> detector.validateTemplateHtml("modele.html", new byte[] {'<', 0, '>'}))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("texte UTF-8");
    }

    @Test
    @DisplayName("Extracts a lowercase extension and handles missing names")
    void extension() {
        assertThat(detector.extension("Fichier.TXT")).isEqualTo("txt");
        assertThat(detector.extension(null)).isEmpty();
        assertThat(detector.extension("sans-point")).isEmpty();
        assertThat(detector.extension("terminé.")).isEmpty();
    }

    private static byte[] zip(String entryName) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(output)) {
            zip.putNextEntry(new ZipEntry(entryName));
            zip.write("<xml/>".getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        return output.toByteArray();
    }
}
