package fr.hkof.homeofficeexpenses.service.extraction;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import javax.imageio.ImageIO;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;

/**
 * Reads PDF documents: external {@code pdftotext}, PDFBox text layer, OCR fallback and the
 * final vision image path.
 */
class PdfDocumentReader {

    private static final int MAX_TEXT_PAGES = 20;
    private static final int MINIMUM_TEXT_LENGTH = 20;
    private static final int OCR_DPI = 300;

    private final String pdftextCommand;
    private final Duration pdftextTimeout;
    private final boolean ocrEnabled;
    private final OcrTextExtractor ocrTextExtractor;

    PdfDocumentReader(String pdftextCommand, Duration pdftextTimeout, boolean ocrEnabled,
            OcrTextExtractor ocrTextExtractor) {
        this.pdftextCommand = pdftextCommand;
        this.pdftextTimeout = pdftextTimeout;
        this.ocrEnabled = ocrEnabled;
        this.ocrTextExtractor = ocrTextExtractor;
    }

    DocumentTextExtractor.Extraction extract(Path path, byte[] content, int maxPagesVision) throws IOException {
        String externalText = extractWithPdftext(path);
        if (externalText != null) {
            return textOnly(externalText);
        }
        try (PDDocument document = PDDocument.load(content)) {
            int pages = document.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setEndPage(Math.min(pages, MAX_TEXT_PAGES));
            String text = stripper.getText(document).trim();
            if (text.length() >= MINIMUM_TEXT_LENGTH) {
                return textOnly(DocumentTextNormalizer.truncate(text));
            }
            if (ocrEnabled) {
                String ocrText = ocrPages(document, pages, maxPagesVision);
                if (ocrText.length() >= MINIMUM_TEXT_LENGTH) {
                    return textOnly(ocrText);
                }
            }
            List<String> images = new ArrayList<>();
            PDFRenderer renderer = new PDFRenderer(document);
            int limit = Math.min(pages, Math.max(1, maxPagesVision));
            for (int i = 0; i < limit; i++) {
                BufferedImage image = renderer.renderImageWithDPI(i, 150, ImageType.RGB);
                ByteArrayOutputStream png = new ByteArrayOutputStream();
                ImageIO.write(image, "png", png);
                images.add(Base64.getEncoder().encodeToString(png.toByteArray()));
            }
            return new DocumentTextExtractor.Extraction("", images, true, pages);
        }
    }

    /**
     * Extracts the first pages with {@code pdftotext -layout}. Returns {@code null} when the
     * binary is missing, fails or times out, so the caller can use the PDFBox fallback.
     */
    private String extractWithPdftext(Path path) {
        if (pdftextCommand == null || pdftextCommand.isBlank()) {
            return null;
        }
        List<String> argv = List.of(
                pdftextCommand,
                "-q",
                "-layout",
                "-enc",
                "UTF-8",
                "-f",
                "1",
                "-l",
                Integer.toString(MAX_TEXT_PAGES),
                path.toAbsolutePath().normalize().toString(),
                "-");
        ExternalCommand.Result result = ExternalCommand.run(argv, pdftextTimeout, DocumentTextNormalizer.MAX_LENGTH);
        if (result.timedOut() || result.exitCode() != 0) {
            return null;
        }
        String text = DocumentTextNormalizer.layoutPreserving(result.stdout());
        return text.length() >= MINIMUM_TEXT_LENGTH ? text : null;
    }

    /** Renders the first pages at {@value #OCR_DPI} dpi and joins their OCR text. */
    private String ocrPages(PDDocument document, int pages, int maxPagesVision) {
        PDFRenderer renderer = new PDFRenderer(document);
        int limit = Math.min(pages, Math.max(1, maxPagesVision));
        StringBuilder text = new StringBuilder();
        for (int i = 0; i < limit; i++) {
            Path png = null;
            try {
                BufferedImage image = renderer.renderImageWithDPI(i, OCR_DPI, ImageType.RGB);
                png = Files.createTempFile("hoe-ocr-", ".png");
                restrictToOwner(png);
                if (!ImageIO.write(image, "png", png.toFile())) {
                    continue;
                }
                String pageText = ocrTextExtractor.recognize(png);
                if (!pageText.isBlank()) {
                    if (!text.isEmpty()) {
                        text.append("\n\n");
                    }
                    text.append(pageText.strip());
                }
            } catch (IOException | RuntimeException ex) {
                // OCR is best effort: fall back to the vision path when a page fails.
            } finally {
                deleteQuietly(png);
            }
        }
        return DocumentTextNormalizer.layoutPreserving(text.toString());
    }

    private static void restrictToOwner(Path file) {
        try {
            Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
        } catch (IOException | UnsupportedOperationException ignored) {
            // Non-POSIX file system: temporary file permissions stay at the platform default.
        }
    }

    private static void deleteQuietly(Path file) {
        if (file == null) {
            return;
        }
        try {
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
            // Best-effort cleanup of a temporary rendering.
        }
    }

    private static DocumentTextExtractor.Extraction textOnly(String text) {
        return new DocumentTextExtractor.Extraction(text, List.of(), false, 0);
    }
}
