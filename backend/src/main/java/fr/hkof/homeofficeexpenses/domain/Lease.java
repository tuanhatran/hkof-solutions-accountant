package fr.hkof.homeofficeexpenses.domain;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "lease")
public class Lease {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "landlord_id", nullable = false)
    private Person landlord;

    /** Natural person tenant; null for a company lease whose tenant is {@link #companyId}. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id")
    private Person tenant;

    /** Optional company: when set, the rent receipt uses that company's identity and data. */
    @Column(name = "company_id")
    private Long companyId;

    /** Company lease: the dwelling surfaces below drive the company pro-rata. */
    @Column(name = "company_lease", nullable = false)
    private boolean companyLease;

    @Column(name = "total_area", precision = 8, scale = 2)
    private BigDecimal totalArea;

    @Column(name = "business_area", precision = 8, scale = 2)
    private BigDecimal businessArea;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "address_id", nullable = false)
    private Address address;

    @Column(name = "rent_excl_charges", nullable = false, precision = 12, scale = 2)
    private BigDecimal rentExclCharges;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal charges;

    @Column(nullable = false)
    private boolean deleted;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

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

    public Person getLandlord() {
        return landlord;
    }

    public void setLandlord(Person landlord) {
        this.landlord = landlord;
    }

    public Person getTenant() {
        return tenant;
    }

    public void setTenant(Person tenant) {
        this.tenant = tenant;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
    }

    public boolean isCompanyLease() {
        return companyLease;
    }

    public void setCompanyLease(boolean companyLease) {
        this.companyLease = companyLease;
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

    public Address getAddress() {
        return address;
    }

    public void setAddress(Address address) {
        this.address = address;
    }

    public BigDecimal getRentExclCharges() {
        return rentExclCharges;
    }

    public void setRentExclCharges(BigDecimal rentExclCharges) {
        this.rentExclCharges = rentExclCharges;
    }

    public BigDecimal getCharges() {
        return charges;
    }

    public void setCharges(BigDecimal charges) {
        this.charges = charges;
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
}
