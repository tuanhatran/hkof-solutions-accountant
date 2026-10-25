package fr.hkof.homeofficeexpenses.domain;

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
@Table(name = "expense_item")
public class ExpenseItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    /** Active company lease this item belongs to; null for an inherited, unassigned item. */
    @Column(name = "lease_id")
    private Long leaseId;

    @Column(nullable = false, length = 40)
    private String code;

    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "supplier")
    private String supplier;

    @Column(name = "pro_rata_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal proRataPct;

    @Enumerated(EnumType.STRING)
    @Column(name = "periodicity", nullable = false, length = 20)
    private Periodicity periodicity;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "multiple_lines_allowed", nullable = false)
    private boolean multipleLinesAllowed;

    @Column(name = "deleted", nullable = false)
    private boolean deleted;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
    }

    public Long getLeaseId() {
        return leaseId;
    }

    public void setLeaseId(Long leaseId) {
        this.leaseId = leaseId;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getSupplier() {
        return supplier;
    }

    public void setSupplier(String supplier) {
        this.supplier = supplier;
    }

    public BigDecimal getProRataPct() {
        return proRataPct;
    }

    public void setProRataPct(BigDecimal proRataPct) {
        this.proRataPct = proRataPct;
    }

    public Periodicity getPeriodicity() {
        return periodicity;
    }

    public void setPeriodicity(Periodicity periodicity) {
        this.periodicity = periodicity;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public boolean isMultipleLinesAllowed() {
        return multipleLinesAllowed;
    }

    public void setMultipleLinesAllowed(boolean multipleLinesAllowed) {
        this.multipleLinesAllowed = multipleLinesAllowed;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }
}
