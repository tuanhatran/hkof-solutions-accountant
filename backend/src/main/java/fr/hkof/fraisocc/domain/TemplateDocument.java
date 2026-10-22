package fr.hkof.fraisocc.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "template_document")
public class TemplateDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TypeTemplate type;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private int version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private FormatTemplate format;

    @Column(nullable = false)
    private String chemin;

    @Column(nullable = false)
    private boolean actif;

    @Column(nullable = false)
    private boolean integre;

    @Column(nullable = false)
    private boolean supprime;

    @Column(name = "rapport_validation", columnDefinition = "text")
    private String rapportValidation;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public TypeTemplate getType() {
        return type;
    }

    public void setType(TypeTemplate type) {
        this.type = type;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public FormatTemplate getFormat() {
        return format;
    }

    public void setFormat(FormatTemplate format) {
        this.format = format;
    }

    public String getChemin() {
        return chemin;
    }

    public void setChemin(String chemin) {
        this.chemin = chemin;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }

    public boolean isIntegre() {
        return integre;
    }

    public void setIntegre(boolean integre) {
        this.integre = integre;
    }

    public boolean isSupprime() {
        return supprime;
    }

    public void setSupprime(boolean supprime) {
        this.supprime = supprime;
    }

    public String getRapportValidation() {
        return rapportValidation;
    }

    public void setRapportValidation(String rapportValidation) {
        this.rapportValidation = rapportValidation;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
