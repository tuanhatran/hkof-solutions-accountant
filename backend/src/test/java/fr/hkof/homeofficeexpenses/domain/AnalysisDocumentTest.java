package fr.hkof.homeofficeexpenses.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AnalysisDocumentTest {

    @Test
    @DisplayName("Exposes every persisted field through its accessors")
    void accessors() {
        Receipt receipt = new Receipt();
        receipt.setId(7L);
        Instant created = Instant.parse("2026-10-01T08:00:00Z");
        Instant updated = Instant.parse("2026-10-01T09:00:00Z");

        AnalysisDocument document = new AnalysisDocument();
        document.setId(3L);
        document.setReceipt(receipt);
        document.setStatus(AnalysisStatus.RUNNING);
        document.setModel("llama-test");
        document.setDurationMs(1_500L);
        document.setResultJson("{\"montant_ttc\":\"78.00\"}");
        document.setErrorMessage("Erreur");
        document.setCreatedAt(created);
        document.setUpdatedAt(updated);

        assertThat(document.getId()).isEqualTo(3L);
        assertThat(document.getReceipt()).isSameAs(receipt);
        assertThat(document.getStatus()).isEqualTo(AnalysisStatus.RUNNING);
        assertThat(document.getModel()).isEqualTo("llama-test");
        assertThat(document.getDurationMs()).isEqualTo(1_500L);
        assertThat(document.getResultJson()).isEqualTo("{\"montant_ttc\":\"78.00\"}");
        assertThat(document.getErrorMessage()).isEqualTo("Erreur");
        assertThat(document.getCreatedAt()).isEqualTo(created);
        assertThat(document.getUpdatedAt()).isEqualTo(updated);
    }
}
