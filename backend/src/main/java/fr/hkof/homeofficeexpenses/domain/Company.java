package fr.hkof.homeofficeexpenses.domain;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A company profile: identity, home-office data and issue place. It owns its expense items
 * and expense statements.
 */
@Entity
@Table(name = "company")
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "legal_form")
    private String legalForm;

    private String siren;

    @Column(name = "address")
    private String address;

    @Column(name = "manager_name")
    private String managerName;

    @Column(name = "home_address")
    private String homeAddress;

    @Column(name = "total_area", precision = 8, scale = 2)
    private BigDecimal totalArea;

    @Column(name = "business_area", precision = 8, scale = 2)
    private BigDecimal businessArea;

    @Column(name = "issue_place")
    private String issuePlace;

    /** Active lease of the company among the leases it owns; null falls back to the oldest lease. */
    @Column(name = "active_lease_id")
    private Long activeLeaseId;

    @Column(name = "deleted", nullable = false)
    private boolean deleted;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLegalForm() {
        return legalForm;
    }

    public void setLegalForm(String legalForm) {
        this.legalForm = legalForm;
    }

    public String getSiren() {
        return siren;
    }

    public void setSiren(String siren) {
        this.siren = siren;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getManagerName() {
        return managerName;
    }

    public void setManagerName(String managerName) {
        this.managerName = managerName;
    }

    public String getHomeAddress() {
        return homeAddress;
    }

    public void setHomeAddress(String homeAddress) {
        this.homeAddress = homeAddress;
    }

    public BigDecimal getTotalArea() {
        return totalArea;
    }

    public void setTotalArea(BigDecimal totalArea) {
        this.totalArea = totalArea;
    }

    public BigDecimal getBusinessArea() {
        return businessArea;
    }

    public void setBusinessArea(BigDecimal businessArea) {
        this.businessArea = businessArea;
    }

    public String getIssuePlace() {
        return issuePlace;
    }

    public void setIssuePlace(String issuePlace) {
        this.issuePlace = issuePlace;
    }

    public Long getActiveLeaseId() {
        return activeLeaseId;
    }

    public void setActiveLeaseId(Long activeLeaseId) {
        this.activeLeaseId = activeLeaseId;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
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
