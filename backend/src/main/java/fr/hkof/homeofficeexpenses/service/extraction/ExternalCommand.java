package fr.hkof.homeofficeexpenses.service.extraction;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Runs an external command with a fixed argv, without a shell.
 *
 * <p>Only stdout is captured, up to a character cap; stderr is discarded. The process is
 * forcibly killed when the timeout expires. A missing binary is reported as
 * {@code Result(-1, "", false)} so callers can fall back to an in-process implementation.
 */
public final class ExternalCommand {

    private static final int READ_BUFFER = 8_192;
    private static final long KILL_WAIT_SECONDS = 5;

    private ExternalCommand() {
    }

    public static Result run(List<String> argv, Duration timeout, int maxChars) {
        if (argv == null || argv.isEmpty()) {
            return new Result(-1, "", false);
        }
        Process process;
        try {
            process = new ProcessBuilder(argv)
                    .redirectError(ProcessBuilder.Redirect.DISCARD)
                    .start();
        } catch (IOException ex) {
            return new Result(-1, "", false);
        }

        OutputCollector collector = new OutputCollector(process.getInputStream(), Math.max(0, maxChars));
        Thread drainer = new Thread(collector, "external-command-stdout");
        drainer.setDaemon(true);
        drainer.start();

        long timeoutMillis = timeout == null ? -1 : Math.max(0, timeout.toMillis());
        boolean timedOut = false;
        boolean interrupted = false;
        try {
            if (timeoutMillis < 0) {
                process.waitFor();
            } else if (!process.waitFor(timeoutMillis, TimeUnit.MILLISECONDS)) {
                timedOut = true;
            }
        } catch (InterruptedException ex) {
            interrupted = true;
            Thread.currentThread().interrupt();
        }

        if (timedOut || interrupted) {
            process.destroyForcibly();
        }
        try {
            process.waitFor(KILL_WAIT_SECONDS, TimeUnit.SECONDS);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
        join(drainer);

        int exitCode = process.isAlive() ? -1 : process.exitValue();
        return new Result(exitCode, collector.stdout(), timedOut);
    }

    private static void join(Thread thread) {
        try {
            thread.join(TimeUnit.SECONDS.toMillis(KILL_WAIT_SECONDS));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }

    /** Keeps at most {@code maxChars} characters, then drains the stream until EOF. */
    private static final class OutputCollector implements Runnable {

        private final InputStream input;
        private final int maxChars;
        private final StringBuilder buffer = new StringBuilder();

        private OutputCollector(InputStream input, int maxChars) {
            this.input = input;
            this.maxChars = maxChars;
        }

        @Override
        public void run() {
            try (Reader reader = new InputStreamReader(input, StandardCharsets.UTF_8)) {
                char[] chunk = new char[READ_BUFFER];
                int read;
                while ((read = reader.read(chunk)) != -1) {
                    int remaining = maxChars - buffer.length();
                    if (remaining > 0) {
                        buffer.append(chunk, 0, Math.min(read, remaining));
                    }
                }
            } catch (IOException ignored) {
                // The process was killed or the stream closed: keep what was read.
            }
        }

        private String stdout() {
            return buffer.toString();
        }
    }

    public record Result(int exitCode, String stdout, boolean timedOut) {
    }
}
