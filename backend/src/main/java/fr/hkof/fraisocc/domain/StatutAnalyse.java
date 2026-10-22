package fr.hkof.fraisocc.domain;

public enum StatutAnalyse {
    EN_ATTENTE,
    EN_COURS,
    TERMINEE,
    ECHEC,
    ANNULEE;

    public boolean estTermine() {
        return this == TERMINEE || this == ECHEC || this == ANNULEE;
    }
}
