package fr.hkof.homeofficeexpenses.service.extraction;

import java.nio.file.Path;
import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Runs the configured OCR command on a rendered page image.
 *
 * <p>OCR is a best-effort enrichment: a missing binary, a timeout or a non-zero exit code
 * yields an empty string so callers can keep their fallback path.
 */
@Service
public class OcrTextExtractor {

    private static final int MAX_OUTPUT = 24_000;

    private final String command;
    private final String language;
    private final Duration timeoutPerPage;

    public OcrTextExtractor(
            @Value("${analysis.ocr.command:tesseract}") String command,
            @Value("${analysis.ocr.language:fra}") String language,
            @Value("${analysis.ocr.timeout-per-page:30s}") Duration timeoutPerPage) {
        this.command = command;
        this.language = language;
        this.timeoutPerPage = timeoutPerPage;
    }

    public String recognize(Path png) {
        if (png == null) {
            return "";
        }
        List<String> argv = List.of(
                command,
                png.toAbsolutePath().normalize().toString(),
                "stdout",
                "-l",
                language,
                "--psm",
                "6");
        ExternalCommand.Result result = ExternalCommand.run(argv, timeoutPerPage, MAX_OUTPUT);
        if (result.timedOut() || result.exitCode() != 0) {
            return "";
        }
        return result.stdout().trim();
    }
}
