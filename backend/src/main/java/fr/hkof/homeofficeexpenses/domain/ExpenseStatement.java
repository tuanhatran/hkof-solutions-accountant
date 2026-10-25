package fr.hkof.homeofficeexpenses.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

@Entity
@Table(name = "expense_statement")
public class ExpenseStatement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    /** Active company lease this statement belongs to; null for an inherited, unassigned statement. */
    @Column(name = "lease_id")
    private Long leaseId;

    @Column(name = "billing_month", nullable = false, length = 7)
    private String month;

    @Column(name = "statement_number", nullable = false, length = 20)
    private String number;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Column(nullable = false)
    private int version;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DocumentStatus status;

    @Column(name = "template_id")
    private Long templateId;

    @Column(name = "template_name")
    private String templateName;

    @Column(name = "template_version")
    private Integer templateVersion;

    @Column(name = "pdf_path")
    private String pdfPath;

    @Column(name = "full_pdf_path")
    private String fullPdfPath;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "expenseStatement", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<ExpenseLine> lines = new ArrayList<>();

    public void addLine(ExpenseLine line) {
        line.setExpenseStatement(this);
        this.lines.add(line);
    }

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

    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public String getNumber() {
        return number;
    }

    public void setNumber(String number) {
        this.number = number;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public DocumentStatus getStatus() {
        return status;
    }

    public void setStatus(DocumentStatus status) {
        this.status = status;
    }

    public Long getTemplateId() {
        return templateId;
    }

    public void setTemplateId(Long templateId) {
        this.templateId = templateId;
    }

    public String getTemplateName() {
        return templateName;
    }

    public void setTemplateName(String templateName) {
        this.templateName = templateName;
    }

    public Integer getTemplateVersion() {
        return templateVersion;
    }

    public void setTemplateVersion(Integer templateVersion) {
        this.templateVersion = templateVersion;
    }

    public String getPdfPath() {
        return pdfPath;
    }

    public void setPdfPath(String pdfPath) {
        this.pdfPath = pdfPath;
    }

    public String getFullPdfPath() {
        return fullPdfPath;
    }

    public void setFullPdfPath(String fullPdfPath) {
        this.fullPdfPath = fullPdfPath;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public List<ExpenseLine> getLines() {
        return lines;
    }

    public void setLines(List<ExpenseLine> lines) {
        this.lines = lines;
    }
}
