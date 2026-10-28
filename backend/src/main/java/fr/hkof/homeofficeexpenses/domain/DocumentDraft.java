package fr.hkof.homeofficeexpenses.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Editable form state saved by the user for one generation scope. A draft is never a
 * document: it stores the values of the form, not a rendered receipt or statement. Each
 * save inserts a new row and logically deletes the previous active row of the same scope,
 * so a previous draft version is never overwritten.
 */
@Entity
@Table(name = "document_draft")
public class DocumentDraft {

    public enum Type {
        RENT_RECEIPT,
        EXPENSE_STATEMENT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "draft_type", nullable = false, length = 20)
    private Type type;

    @Column(name = "billing_month", nullable = false, length = 7)
    private String month;

    @Column(name = "company_id")
    private Long companyId;

    @Column(name = "landlord_id")
    private Long landlordId;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(name = "tenant_company_id")
    private Long tenantCompanyId;

    /** JSON of the validated request; the canonical shape lives in the DTOs. */
    @Column(nullable = false, columnDefinition = "text")
    private String payload;

    @Column(name = "saved_at", nullable = false)
    private Instant savedAt;

    @Column(nullable = false)
    private boolean deleted;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }

    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
    }

    public Long getLandlordId() {
        return landlordId;
    }

    public void setLandlordId(Long landlordId) {
        this.landlordId = landlordId;
    }

    public Long getTenantId() {
        return tenantId;
    }

    public void setTenantId(Long tenantId) {
        this.tenantId = tenantId;
    }

    public Long getTenantCompanyId() {
        return tenantCompanyId;
    }

    public void setTenantCompanyId(Long tenantCompanyId) {
        this.tenantCompanyId = tenantCompanyId;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public Instant getSavedAt() {
        return savedAt;
    }

    public void setSavedAt(Instant savedAt) {
        this.savedAt = savedAt;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }
}
