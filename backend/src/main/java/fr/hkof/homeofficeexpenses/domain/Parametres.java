package fr.hkof.homeofficeexpenses.domain;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "settings")
public class Parametres {

    @Id
    private Long id;

    @Column(name = "company_name")
    private String raisonSociale;

    @Column(name = "legal_form")
    private String formeJuridique;

    private String siren;

    @Column(name = "company_address")
    private String societeAdresse;

    @Column(name = "manager_name")
    private String gerant;

    @Column(name = "home_address")
    private String logementAdresse;

    @Column(name = "total_area", precision = 8, scale = 2)
    private BigDecimal surfaceTotale;

    @Column(name = "business_area", precision = 8, scale = 2)
    private BigDecimal surfacePro;

    @Column(name = "landlord_name")
    private String bailleurNom;

    @Column(name = "landlord_address")
    private String bailleurAdresse;

    @Column(name = "tenant_name")
    private String locataireNom;

    @Column(name = "tenant_address")
    private String locataireAdresse;

    @Column(name = "rent_excl_charges", precision = 12, scale = 2)
    private BigDecimal loyerHc;

    @Column(name = "charges_advance", precision = 12, scale = 2)
    private BigDecimal provisionCharges;

    @Column(name = "issue_place")
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
