package fr.hkof.homeofficeexpenses.domain;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "expense_line")
public class ExpenseLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "statement_id", nullable = false)
    private ExpenseStatement expenseStatement;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private ExpenseItem expenseItem;

    @Column(name = "amount_incl_vat", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountInclVat;

    @Column(name = "period_start")
    private LocalDate periodStart;

    @Column(name = "period_end")
    private LocalDate periodEnd;

    @Column(name = "monthly_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal monthlyAmount;

    @Column(name = "pro_rata_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal proRataPct;

    @Column(name = "claimed_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal claimedAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_id")
    private Receipt receipt;

    @Enumerated(EnumType.STRING)
    @Column(name = "amount_source", nullable = false, length = 10)
    private AmountSource amountSource;

    @Column(name = "ai_detected_amount", precision = 12, scale = 2)
    private BigDecimal aiDetectedAmount;

    @Column(name = "ai_confidence", length = 20)
    private String aiConfidence;

    @Column(name = "label_snapshot")
    private String labelSnapshot;

    @Column(name = "supplier_snapshot")
    private String supplierSnapshot;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ExpenseStatement getExpenseStatement() {
        return expenseStatement;
    }

    public void setExpenseStatement(ExpenseStatement expenseStatement) {
        this.expenseStatement = expenseStatement;
    }

    public ExpenseItem getExpenseItem() {
        return expenseItem;
    }

    public void setExpenseItem(ExpenseItem expenseItem) {
        this.expenseItem = expenseItem;
    }

    public BigDecimal getAmountInclVat() {
        return amountInclVat;
    }

    public void setAmountInclVat(BigDecimal amountInclVat) {
        this.amountInclVat = amountInclVat;
    }

    public LocalDate getPeriodStart() {
        return periodStart;
    }

    public void setPeriodStart(LocalDate periodStart) {
        this.periodStart = periodStart;
    }

    public LocalDate getPeriodEnd() {
        return periodEnd;
    }

    public void setPeriodEnd(LocalDate periodEnd) {
        this.periodEnd = periodEnd;
    }

    public BigDecimal getMonthlyAmount() {
        return monthlyAmount;
    }

    public void setMonthlyAmount(BigDecimal monthlyAmount) {
        this.monthlyAmount = monthlyAmount;
    }

    public BigDecimal getProRataPct() {
        return proRataPct;
    }

    public void setProRataPct(BigDecimal proRataPct) {
        this.proRataPct = proRataPct;
    }

    public BigDecimal getClaimedAmount() {
        return claimedAmount;
    }

    public void setClaimedAmount(BigDecimal claimedAmount) {
        this.claimedAmount = claimedAmount;
    }

    public Receipt getReceipt() {
        return receipt;
    }

    public void setReceipt(Receipt receipt) {
        this.receipt = receipt;
    }

    public AmountSource getAmountSource() {
        return amountSource;
    }

    public void setAmountSource(AmountSource amountSource) {
        this.amountSource = amountSource;
    }

    public BigDecimal getAiDetectedAmount() {
        return aiDetectedAmount;
    }

    public void setAiDetectedAmount(BigDecimal aiDetectedAmount) {
        this.aiDetectedAmount = aiDetectedAmount;
    }

    public String getAiConfidence() {
        return aiConfidence;
    }

    public void setAiConfidence(String aiConfidence) {
        this.aiConfidence = aiConfidence;
    }

    public String getLabelSnapshot() {
        return labelSnapshot;
    }

    public void setLabelSnapshot(String labelSnapshot) {
        this.labelSnapshot = labelSnapshot;
    }

    public String getSupplierSnapshot() {
        return supplierSnapshot;
    }

    public void setSupplierSnapshot(String supplierSnapshot) {
        this.supplierSnapshot = supplierSnapshot;
    }
}
