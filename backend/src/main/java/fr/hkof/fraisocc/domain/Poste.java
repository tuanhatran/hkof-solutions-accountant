package fr.hkof.fraisocc.domain;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "poste")
public class Poste {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false)
    private String libelle;

    private String fournisseur;

    @Column(name = "prorata_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal prorataPct;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Periodicite periodicite;

    @Column(nullable = false)
    private boolean actif = true;

    @Column(nullable = false)
    private int ordre;

    @Column(name = "plusieurs_lignes_autorisees", nullable = false)
    private boolean plusieursLignesAutorisees;

    @Column(nullable = false)
    private boolean supprime;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getFournisseur() {
        return fournisseur;
    }

    public void setFournisseur(String fournisseur) {
        this.fournisseur = fournisseur;
    }

    public BigDecimal getProrataPct() {
        return prorataPct;
    }

    public void setProrataPct(BigDecimal prorataPct) {
        this.prorataPct = prorataPct;
    }

    public Periodicite getPeriodicite() {
        return periodicite;
    }

    public void setPeriodicite(Periodicite periodicite) {
        this.periodicite = periodicite;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }

    public int getOrdre() {
        return ordre;
    }

    public void setOrdre(int ordre) {
        this.ordre = ordre;
    }

    public boolean isPlusieursLignesAutorisees() {
        return plusieursLignesAutorisees;
    }

    public void setPlusieursLignesAutorisees(boolean plusieursLignesAutorisees) {
        this.plusieursLignesAutorisees = plusieursLignesAutorisees;
    }

    public boolean isSupprime() {
        return supprime;
    }

    public void setSupprime(boolean supprime) {
        this.supprime = supprime;
    }
}
