package fr.hkof.homeofficeexpenses.service.extraction;

/**
 * Normalizes extracted document text and caps its length while preserving layout.
 */
final class DocumentTextNormalizer {

    static final int MAX_LENGTH = 24_000;

    private DocumentTextNormalizer() {
    }

    /**
     * Normalizes whitespace and caps the text on two flat lines.
     */
    static String truncate(String text) {
        if (text == null) {
            return "";
        }
        String normalized = text.replaceAll("[\\t\\r]+", " ").replaceAll(" {2,}", " ").trim();
        if (normalized.length() <= MAX_LENGTH) {
            return normalized;
        }
        int head = MAX_LENGTH / 2;
        int tail = MAX_LENGTH - head;
        return normalized.substring(0, head) + "\n[…]\n" + normalized.substring(normalized.length() - tail);
    }

    /**
     * Normalizes line endings and caps the text while preserving the layout: inner spaces and
     * blank lines are kept, unlike {@link #truncate(String)}.
     */
    static String layoutPreserving(String text) {
        if (text == null) {
            return "";
        }
        String normalized = text
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replace('\u000C', '\n');
        String[] lines = normalized.split("\n", -1);
        StringBuilder result = new StringBuilder(normalized.length());
        for (int i = 0; i < lines.length; i++) {
            if (i > 0) {
                result.append('\n');
            }
            result.append(stripTrailingSpaces(lines[i]));
        }
        String trimmed = result.toString().trim();
        if (trimmed.length() <= MAX_LENGTH) {
            return trimmed;
        }
        int head = MAX_LENGTH / 2;
        int tail = MAX_LENGTH - head;
        return trimmed.substring(0, head) + "\n[…]\n" + trimmed.substring(trimmed.length() - tail);
    }

    private static String stripTrailingSpaces(String line) {
        int end = line.length();
        while (end > 0 && (line.charAt(end - 1) == ' ' || line.charAt(end - 1) == '\t')) {
            end--;
        }
        return line.substring(0, end);
    }
}
