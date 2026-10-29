package fr.hkof.homeofficeexpenses.domain;

import java.math.BigDecimal;
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
@Table(name = "llm_config")
public class LlmConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    private LlmProvider supplier = LlmProvider.OLLAMA;

    @Column(nullable = false)
    private String url;

    @Column(name = "model")
    private String model;

    @Column(name = "timeout_seconds", nullable = false)
    private int timeoutSeconds = 120;

    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal temperature = BigDecimal.ZERO;

    @Column(name = "num_ctx", nullable = false)
    private int numCtx = 8192;

    @Column(name = "pages_max", nullable = false)
    private int maxPages = 5;

    @Column(name = "ocr_enabled", nullable = false)
    private boolean ocrActive;

    @Column(name = "extraction_prompt", nullable = false, columnDefinition = "text")
    private String extractionPrompt;

    @Column(name = "api_key", columnDefinition = "text")
    private String apiKey;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public LlmProvider getSupplier() {
        return supplier;
    }

    public void setSupplier(LlmProvider supplier) {
        this.supplier = supplier;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
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

    public int getMaxPages() {
        return maxPages;
    }

    public void setMaxPages(int maxPages) {
        this.maxPages = maxPages;
    }

    public boolean isOcrActive() {
        return ocrActive;
    }

    public void setOcrActive(boolean ocrActive) {
        this.ocrActive = ocrActive;
    }

    public String getExtractionPrompt() {
        return extractionPrompt;
    }

    public void setExtractionPrompt(String extractionPrompt) {
        this.extractionPrompt = extractionPrompt;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
