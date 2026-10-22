package fr.hkof.homeofficeexpenses.domain;

public enum AnalysisStatus {
    PENDING,
    RUNNING,
    DONE,
    FAILED,
    CANCELLED;

    public boolean isFinished() {
        return this == DONE || this == FAILED || this == CANCELLED;
    }
}
