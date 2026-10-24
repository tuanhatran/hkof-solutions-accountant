package fr.hkof.homeofficeexpenses.service.extraction;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ExternalCommandTest {

    @TempDir
    Path tempDir;

    @Test
    @DisplayName("Runs a fixed argv without a shell and captures stdout and exit code")
    void capturesStdout() {
        ExternalCommand.Result result = ExternalCommand.run(
                List.of("/bin/echo", "hello"), Duration.ofSeconds(5), 1_000);

        assertThat(result.exitCode()).isZero();
        assertThat(result.timedOut()).isFalse();
        assertThat(result.stdout()).isEqualTo("hello\n");
    }

    @Test
    @DisplayName("Kills a hung process after the timeout")
    void timesOut() {
        long started = System.nanoTime();

        ExternalCommand.Result result = ExternalCommand.run(
                List.of("/bin/sleep", "5"), Duration.ofMillis(100), 1_000);

        long elapsedMillis = (System.nanoTime() - started) / 1_000_000;
        assertThat(result.timedOut()).isTrue();
        assertThat(elapsedMillis).isLessThan(2_000);
    }

    @Test
    @DisplayName("Caps stdout and drains the remaining output without blocking")
    void capsStdout() throws Exception {
        Path script = executable("""
                #!/bin/sh
                head -c 100000 /dev/zero | tr '\\0' 'a'
                """);

        ExternalCommand.Result result = ExternalCommand.run(
                List.of(script.toString()), Duration.ofSeconds(10), 10);

        assertThat(result.timedOut()).isFalse();
        assertThat(result.stdout()).hasSize(10);
    }

    @Test
    @DisplayName("Returns a failure result when the binary is missing")
    void missingBinary() {
        ExternalCommand.Result result = ExternalCommand.run(
                List.of("/nonexistent/pdftotext", "-v"), Duration.ofSeconds(1), 100);

        assertThat(result.exitCode()).isEqualTo(-1);
        assertThat(result.stdout()).isEmpty();
        assertThat(result.timedOut()).isFalse();
    }

    private Path executable(String content) throws Exception {
        Path script = tempDir.resolve("fake-command.sh");
        Files.writeString(script, content);
        Files.setPosixFilePermissions(script, PosixFilePermissions.fromString("rwx------"));
        return script;
    }

    @Test
    @DisplayName("A null or empty argv fails without starting a process")
    void invalidArgv() {
        assertThat(ExternalCommand.run(null, Duration.ofSeconds(1), 10))
                .isEqualTo(new ExternalCommand.Result(-1, "", false));
        assertThat(ExternalCommand.run(List.of(), Duration.ofSeconds(1), 10))
                .isEqualTo(new ExternalCommand.Result(-1, "", false));
    }

    @Test
    @DisplayName("A null timeout waits for completion instead of timing out")
    void nullTimeoutWaits() {
        ExternalCommand.Result result = ExternalCommand.run(List.of("/bin/echo", "hello"), null, 1_000);

        assertThat(result.exitCode()).isZero();
        assertThat(result.timedOut()).isFalse();
        assertThat(result.stdout()).isEqualTo("hello\n");
    }

    @Test
    @DisplayName("A zero character cap drains stdout but returns an empty string")
    void zeroCharacterCap() {
        ExternalCommand.Result result = ExternalCommand.run(List.of("/bin/echo", "hello"), Duration.ofSeconds(5), 0);

        assertThat(result.exitCode()).isZero();
        assertThat(result.timedOut()).isFalse();
        assertThat(result.stdout()).isEmpty();
    }
}
