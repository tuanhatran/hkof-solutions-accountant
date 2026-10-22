package fr.hkof.homeofficeexpenses.domain;

public enum AnalysisStatus {
    EN_ATTENTE,
    EN_COURS,
    TERMINEE,
    ECHEC,
    ANNULEE;

    public boolean estTermine() {
        return this == TERMINEE || this == ECHEC || this == ANNULEE;
    }
}
