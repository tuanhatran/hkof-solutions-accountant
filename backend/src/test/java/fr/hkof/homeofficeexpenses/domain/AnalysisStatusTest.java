package fr.hkof.homeofficeexpenses.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AnalysisStatusTest {

    @Test
    @DisplayName("Only DONE, FAILED and CANCELLED are finished states")
    void isFinished() {
        assertThat(AnalysisStatus.PENDING.isFinished()).isFalse();
        assertThat(AnalysisStatus.RUNNING.isFinished()).isFalse();
        assertThat(AnalysisStatus.DONE.isFinished()).isTrue();
        assertThat(AnalysisStatus.FAILED.isFinished()).isTrue();
        assertThat(AnalysisStatus.CANCELLED.isFinished()).isTrue();
    }
}
