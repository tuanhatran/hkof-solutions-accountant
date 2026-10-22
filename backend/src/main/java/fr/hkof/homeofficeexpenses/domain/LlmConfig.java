package fr.hkof.homeofficeexpenses.domain;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "llm_config")
public class LlmConfig {

    @Id
    private Long id;

    @Column(name = "active", nullable = false)
    private boolean actif = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    private FournisseurLlm fournisseur = FournisseurLlm.OLLAMA;

    @Column(nullable = false)
    private String url;

    @Column(name = "model")
    private String modele;

    @Column(name = "timeout_seconds", nullable = false)
    private int timeoutSeconds = 120;

    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal temperature = BigDecimal.ZERO;

    @Column(name = "num_ctx", nullable = false)
    private int numCtx = 8192;

    @Column(name = "pages_max", nullable = false)
    private int pagesMax = 5;

    @Column(name = "ocr_enabled", nullable = false)
    private boolean ocrActif;

    @Column(name = "extraction_prompt", nullable = false, columnDefinition = "text")
    private String promptExtraction;

    @Column(name = "api_key", columnDefinition = "text")
    private String cleApi;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }

    public FournisseurLlm getFournisseur() {
        return fournisseur;
    }

    public void setFournisseur(FournisseurLlm fournisseur) {
        this.fournisseur = fournisseur;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getModele() {
        return modele;
    }

    public void setModele(String modele) {
        this.modele = modele;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    public BigDecimal getTemperature() {
        return temperature;
    }

    public void setTemperature(BigDecimal temperature) {
        this.temperature = temperature;
    }

    public int getNumCtx() {
        return numCtx;
    }

    public void setNumCtx(int numCtx) {
        this.numCtx = numCtx;
    }

    public int getPagesMax() {
        return pagesMax;
    }

    public void setPagesMax(int pagesMax) {
        this.pagesMax = pagesMax;
    }

    public boolean isOcrActif() {
        return ocrActif;
    }

    public void setOcrActif(boolean ocrActif) {
        this.ocrActif = ocrActif;
    }

    public String getPromptExtraction() {
        return promptExtraction;
    }

    public void setPromptExtraction(String promptExtraction) {
        this.promptExtraction = promptExtraction;
    }

    public String getCleApi() {
        return cleApi;
    }

    public void setCleApi(String cleApi) {
        this.cleApi = cleApi;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
