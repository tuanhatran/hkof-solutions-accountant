package fr.hkof.fraisocc.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "analyse_document")
public class AnalyseDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "justificatif_id", nullable = false)
    private Justificatif justificatif;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutAnalyse statut;

    private String modele;

    @Column(name = "duree_ms")
    private Long dureeMs;

    @Column(name = "resultat_json", columnDefinition = "text")
    private String resultatJson;

    @Column(name = "message_erreur", columnDefinition = "text")
    private String messageErreur;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Justificatif getJustificatif() {
        return justificatif;
    }

    public void setJustificatif(Justificatif justificatif) {
        this.justificatif = justificatif;
    }

    public StatutAnalyse getStatut() {
        return statut;
    }

    public void setStatut(StatutAnalyse statut) {
        this.statut = statut;
    }

    public String getModele() {
        return modele;
    }

    public void setModele(String modele) {
        this.modele = modele;
    }

    public Long getDureeMs() {
        return dureeMs;
    }

    public void setDureeMs(Long dureeMs) {
        this.dureeMs = dureeMs;
    }

    public String getResultatJson() {
        return resultatJson;
    }

    public void setResultatJson(String resultatJson) {
        this.resultatJson = resultatJson;
    }

    public String getMessageErreur() {
        return messageErreur;
    }

    public void setMessageErreur(String messageErreur) {
        this.messageErreur = messageErreur;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
