package fr.hkof.homeofficeexpenses.service.extraction;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Duration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OcrTextExtractorTest {

    @TempDir
    Path tempDir;

    @Test
    @DisplayName("Returns the text printed by the configured OCR command")
    void returnsOcrText() throws Exception {
        Path script = executable("""
                #!/bin/sh
                printf '%s\\n' 'Total TTC 49,99'
                """);
        OcrTextExtractor extractor = new OcrTextExtractor(script.toString(), "fra", Duration.ofSeconds(5));
        Path png = Files.write(tempDir.resolve("page.png"), new byte[] {1, 2, 3});

        assertThat(extractor.recognize(png)).isEqualTo("Total TTC 49,99");
    }

    @Test
    @DisplayName("Returns an empty string when the OCR binary is missing")
    void missingCommand() {
        OcrTextExtractor extractor = new OcrTextExtractor(
                "/nonexistent/tesseract", "fra", Duration.ofSeconds(1));

        assertThat(extractor.recognize(tempDir.resolve("page.png"))).isEmpty();
    }

    @Test
    @DisplayName("Returns an empty string when the OCR command fails")
    void failedCommand() throws Exception {
        Path script = executable("""
                #!/bin/sh
                exit 3
                """);
        OcrTextExtractor extractor = new OcrTextExtractor(script.toString(), "fra", Duration.ofSeconds(5));
        Path png = Files.write(tempDir.resolve("page.png"), new byte[] {1});

        assertThat(extractor.recognize(png)).isEmpty();
    }

    @Test
    @DisplayName("Returns an empty string on timeout")
    void timeout() throws Exception {
        Path script = executable("""
                #!/bin/sh
                sleep 5
                """);
        OcrTextExtractor extractor = new OcrTextExtractor(script.toString(), "fra", Duration.ofMillis(100));
        Path png = Files.write(tempDir.resolve("page.png"), new byte[] {1});

        assertThat(extractor.recognize(png)).isEmpty();
    }

    private Path executable(String content) throws Exception {
        Path script = tempDir.resolve("fake-tesseract.sh");
        Files.writeString(script, content);
        Files.setPosixFilePermissions(script, PosixFilePermissions.fromString("rwx------"));
        return script;
    }
}
