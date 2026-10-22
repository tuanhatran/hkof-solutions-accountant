package fr.hkof.homeofficeexpenses.domain;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "settings")
public class Settings {

    @Id
    private Long id;

    @Column(name = "company_name")
    private String companyName;

    @Column(name = "legal_form")
    private String legalForm;

    private String siren;

    @Column(name = "company_address")
    private String companyAddress;

    @Column(name = "manager_name")
    private String managerName;

    @Column(name = "home_address")
    private String homeAddress;

    @Column(name = "total_area", precision = 8, scale = 2)
    private BigDecimal totalArea;

    @Column(name = "business_area", precision = 8, scale = 2)
    private BigDecimal businessArea;

    @Column(name = "landlord_name")
    private String landlordName;

    @Column(name = "landlord_address")
    private String landlordAddress;

    @Column(name = "tenant_name")
    private String tenantName;

    @Column(name = "tenant_address")
    private String tenantAddress;

    @Column(name = "rent_excl_charges", precision = 12, scale = 2)
    private BigDecimal rentExclCharges;

    @Column(name = "charges_advance", precision = 12, scale = 2)
    private BigDecimal chargesAdvance;

    @Column(name = "issue_place")
    private String issuePlace;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
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

    public String getCompanyAddress() {
        return companyAddress;
    }

    public void setCompanyAddress(String companyAddress) {
        this.companyAddress = companyAddress;
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

    public String getLandlordName() {
        return landlordName;
    }

    public void setLandlordName(String landlordName) {
        this.landlordName = landlordName;
    }

    public String getLandlordAddress() {
        return landlordAddress;
    }

    public void setLandlordAddress(String landlordAddress) {
        this.landlordAddress = landlordAddress;
    }

    public String getTenantName() {
        return tenantName;
    }

    public void setTenantName(String tenantName) {
        this.tenantName = tenantName;
    }

    public String getTenantAddress() {
        return tenantAddress;
    }

    public void setTenantAddress(String tenantAddress) {
        this.tenantAddress = tenantAddress;
    }

    public BigDecimal getRentExclCharges() {
        return rentExclCharges;
    }

    public void setRentExclCharges(BigDecimal rentExclCharges) {
        this.rentExclCharges = rentExclCharges;
    }

    public BigDecimal getChargesAdvance() {
        return chargesAdvance;
    }

    public void setChargesAdvance(BigDecimal chargesAdvance) {
        this.chargesAdvance = chargesAdvance;
    }

    public String getIssuePlace() {
        return issuePlace;
    }

    public void setIssuePlace(String issuePlace) {
        this.issuePlace = issuePlace;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
