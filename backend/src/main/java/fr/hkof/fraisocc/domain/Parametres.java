package fr.hkof.fraisocc.domain;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "parametres")
public class Parametres {

    @Id
    private Long id;

    @Column(name = "raison_sociale")
    private String raisonSociale;

    @Column(name = "forme_juridique")
    private String formeJuridique;

    private String siren;

    @Column(name = "societe_adresse")
    private String societeAdresse;

    private String gerant;

    @Column(name = "logement_adresse")
    private String logementAdresse;

    @Column(name = "surface_totale", precision = 8, scale = 2)
    private BigDecimal surfaceTotale;

    @Column(name = "surface_pro", precision = 8, scale = 2)
    private BigDecimal surfacePro;

    @Column(name = "bailleur_nom")
    private String bailleurNom;

    @Column(name = "bailleur_adresse")
    private String bailleurAdresse;

    @Column(name = "locataire_nom")
    private String locataireNom;

    @Column(name = "locataire_adresse")
    private String locataireAdresse;

    @Column(name = "loyer_hc", precision = 12, scale = 2)
    private BigDecimal loyerHc;

    @Column(name = "provision_charges", precision = 12, scale = 2)
    private BigDecimal provisionCharges;

    @Column(name = "lieu_emission")
    private String lieuEmission;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRaisonSociale() {
        return raisonSociale;
    }

    public void setRaisonSociale(String raisonSociale) {
        this.raisonSociale = raisonSociale;
    }

    public String getFormeJuridique() {
        return formeJuridique;
    }

    public void setFormeJuridique(String formeJuridique) {
        this.formeJuridique = formeJuridique;
    }

    public String getSiren() {
        return siren;
    }

    public void setSiren(String siren) {
        this.siren = siren;
    }

    public String getSocieteAdresse() {
        return societeAdresse;
    }

    public void setSocieteAdresse(String societeAdresse) {
        this.societeAdresse = societeAdresse;
    }

    public String getGerant() {
        return gerant;
    }

    public void setGerant(String gerant) {
        this.gerant = gerant;
    }

    public String getLogementAdresse() {
        return logementAdresse;
    }

    public void setLogementAdresse(String logementAdresse) {
        this.logementAdresse = logementAdresse;
    }

    public BigDecimal getSurfaceTotale() {
        return surfaceTotale;
    }

    public void setSurfaceTotale(BigDecimal surfaceTotale) {
        this.surfaceTotale = surfaceTotale;
    }

    public BigDecimal getSurfacePro() {
        return surfacePro;
    }

    public void setSurfacePro(BigDecimal surfacePro) {
        this.surfacePro = surfacePro;
    }

    public String getBailleurNom() {
        return bailleurNom;
    }

    public void setBailleurNom(String bailleurNom) {
        this.bailleurNom = bailleurNom;
    }

    public String getBailleurAdresse() {
        return bailleurAdresse;
    }

    public void setBailleurAdresse(String bailleurAdresse) {
        this.bailleurAdresse = bailleurAdresse;
    }

    public String getLocataireNom() {
        return locataireNom;
    }

    public void setLocataireNom(String locataireNom) {
        this.locataireNom = locataireNom;
    }

    public String getLocataireAdresse() {
        return locataireAdresse;
    }

    public void setLocataireAdresse(String locataireAdresse) {
        this.locataireAdresse = locataireAdresse;
    }

    public BigDecimal getLoyerHc() {
        return loyerHc;
    }

    public void setLoyerHc(BigDecimal loyerHc) {
        this.loyerHc = loyerHc;
    }

    public BigDecimal getProvisionCharges() {
        return provisionCharges;
    }

    public void setProvisionCharges(BigDecimal provisionCharges) {
        this.provisionCharges = provisionCharges;
    }

    public String getLieuEmission() {
        return lieuEmission;
    }

    public void setLieuEmission(String lieuEmission) {
        this.lieuEmission = lieuEmission;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
