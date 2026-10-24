package fr.hkof.homeofficeexpenses.service.extraction;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DocumentTextNormalizerTest {

    @Test
    @DisplayName("A null or short text is normalized without truncation")
    void shortText() {
        assertThat(DocumentTextNormalizer.truncate(null)).isEmpty();
        assertThat(DocumentTextNormalizer.truncate("  a\t\tb\r c  ")).isEqualTo("a b c");
        assertThat(DocumentTextNormalizer.layoutPreserving(null)).isEmpty();
    }

    @Test
    @DisplayName("Truncation keeps the head and the tail with an ellipsis marker")
    void truncateLongText() {
        String text = "a".repeat(DocumentTextNormalizer.MAX_LENGTH + 100);
        String truncated = DocumentTextNormalizer.truncate(text);
        assertThat(truncated).contains("\n[…]\n");
        assertThat(truncated.length()).isGreaterThan(DocumentTextNormalizer.MAX_LENGTH);
    }

    @Test
    @DisplayName("Layout preserving normalization keeps inner spaces and blank lines")
    void layoutPreservingText() {
        assertThat(DocumentTextNormalizer.layoutPreserving("ligne 1   \r\nligne 2\r\n\r\n"))
                .isEqualTo("ligne 1\nligne 2");
    }

    @Test
    @DisplayName("Layout preserving truncation keeps the head and the tail")
    void layoutPreservingLongText() {
        String text = "b".repeat(DocumentTextNormalizer.MAX_LENGTH + 100);
        String truncated = DocumentTextNormalizer.layoutPreserving(text);
        assertThat(truncated).contains("\n[…]\n");
        assertThat(truncated.length()).isGreaterThan(DocumentTextNormalizer.MAX_LENGTH);
    }

    @Test
    @DisplayName("Form feeds become line breaks and trailing tabs are stripped")
    void formFeedAndTrailingTabs() {
        assertThat(DocumentTextNormalizer.layoutPreserving("page 1\u000Cpage 2\t"))
                .isEqualTo("page 1\npage 2");
    }
}
