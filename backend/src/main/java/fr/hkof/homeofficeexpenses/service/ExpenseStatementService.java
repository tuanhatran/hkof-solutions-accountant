package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.AmountSource;
import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.DocumentStatus;
import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.ExpenseStatement;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.repository.ExpenseStatementRepository;
import fr.hkof.homeofficeexpenses.service.template.TemplateDataService;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.CalculationResponse;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.DraftDto;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.ExpenseLineDto;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.StatementCalculationRequest;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.StatementDto;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.StatementGenerationRequest;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.StatementPreviewRequest;

/**
 * Facade of the expense statement domain: persists statements and orchestrates the line
 * calculator and the document collaborator. Statements are owned by one company.
 */
@Service
public class ExpenseStatementService {

    private final ExpenseStatementRepository repository;
    private final CompanyService companies;
    private final ExpenseItemService expenseItemService;
    private final RentReceiptService rentReceiptService;
    private final TemplateDataService templateDataService;
    private final StorageService storage;
    private final ExpenseStatementLineCalculator lineCalculator;
    private final ExpenseStatementDocumentService documents;
    private final LeaseService leases;
    private final DocumentDraftService documentDraftService;
    private final OwnershipContext ownership;

    public ExpenseStatementService(ExpenseStatementRepository repository, CompanyService companies,
            ExpenseItemService expenseItemService, RentReceiptService rentReceiptService,
            TemplateDataService templateDataService, StorageService storage,
            ExpenseStatementLineCalculator lineCalculator, ExpenseStatementDocumentService documents,
            LeaseService leases, DocumentDraftService documentDraftService, OwnershipContext ownership) {
        this.repository = repository;
        this.companies = companies;
        this.expenseItemService = expenseItemService;
        this.rentReceiptService = rentReceiptService;
        this.templateDataService = templateDataService;
        this.storage = storage;
        this.lineCalculator = lineCalculator;
        this.documents = documents;
        this.leases = leases;
        this.documentDraftService = documentDraftService;
        this.ownership = ownership;
    }

    @Transactional(readOnly = true)
    public CalculationResponse calculate(StatementCalculationRequest request) {
        YearMonth month = Amounts.month(request.month());
        Company company = companies.entity(request.companyId());
        LeaseService.ProRata proRata = leases.proRata(company.getId(), request.leaseId());
        var lease = leases.resolveExpenseLease(company.getId(), request.leaseId());
        List<CalculatedLine> lines = lineCalculator.calculateLines(company.getId(),
                lease == null ? null : lease.getId(), request.lines());
        BigDecimal total = CalculationService.total(lines.stream().map(CalculatedLine::claimedAmount).toList());
        return new CalculationResponse(
                lines.stream().map(lineCalculator::toDto).toList(),
                Amounts.apiValue(total),
                NumberToWords.toWords(total),
                Amounts.apiValue(proRata.base()),
                proRata.detail());
    }

    @Transactional(readOnly = true)
    public DraftDto draft(Long companyId, String monthText, Long leaseId) {
        YearMonth month = Amounts.month(monthText);
        Company company = companies.entity(companyId);
        var lease = leases.resolveExpenseLease(company.getId(), leaseId);
        Long itemLeaseId = lease == null ? null : lease.getId();
        LeaseService.ProRata proRata = leases.proRata(company.getId(), leaseId);
        // The legacy call carries no lease and keeps the historical receipt scope, while the
        // expense items come from the effective lease so a lease-scoped « loyer » resolves.
        RentReceipt rentReceipt = activeReceipt(company.getId(), month.toString(), leaseId);
        List<ExpenseLineDto> lines = new ArrayList<>();
        if (rentReceipt != null) {
            ExpenseItem rentItem = expenseItemService.entity(company.getId(), itemLeaseId, "loyer");
            lines.add(new ExpenseLineDto(
                    null, rentItem.getCode(), rentItem.getLabel(), rentItem.getSupplier(),
                    Amounts.apiValue(rentReceipt.getTotal()),
                    Amounts.apiValue(rentReceipt.getTotal()),
                    "100.00",
                    Amounts.apiValue(rentReceipt.getTotal()),
                    null, null, AmountSource.MANUAL.name(), null, null));
        }
        List<String> missing = expenseItemService.list(company.getId(), itemLeaseId, false).stream()
                .filter(expenseItem -> !expenseItem.code().equals("loyer"))
                .map(expenseItem -> expenseItem.label().toLowerCase(Locale.FRENCH))
                .toList();
        return new DraftDto(
                month.toString(),
                rentReceipt == null ? null : rentReceiptService.toDto(rentReceipt),
                lines,
                Amounts.apiValue(proRata.base()),
                proRata.detail(),
                missing);
    }

    @Transactional(readOnly = true)
    public byte[] preview(StatementPreviewRequest request) {
        YearMonth month = Amounts.month(request.month());
        Company company = companies.entity(request.companyId());
        var lease = leases.resolveExpenseLease(company.getId(), request.leaseId());
        List<CalculatedLine> lines = lineCalculator.calculateLines(company.getId(),
                lease == null ? null : lease.getId(), request.lines());
        return documents.preview(month, lines, company, request, lease == null ? null : lease.getId());
    }

    @Transactional
    public StatementDto generate(StatementGenerationRequest request) {
        YearMonth month = Amounts.month(request.month());
        Company company = companies.entity(request.companyId());
        var lease = leases.resolveExpenseLease(company.getId(), request.leaseId());
        Long leaseId = lease == null ? null : lease.getId();
        List<CalculatedLine> lines = lineCalculator.calculateLines(company.getId(), leaseId, request.lines());
        if (lines.isEmpty()) {
            throw new BusinessException("STATEMENT_LINES_REQUIRED",
                    "Ajoutez au moins un frais avant de générer la note.");
        }
        String signature = documents.signatureDataUri(request.signatureId(), company.getId());
        TemplateDocument template = documents.templateForStatement(request.templateId());
        int version = nextVersion(company.getId(), month.toString(), leaseId);
        archive(company.getId(), month.toString(), leaseId);
        ExpenseStatementDocumentService.GeneratedStatement generated = documents.generate(
                month, lines, version, template, signature, company, leaseId);
        ExpenseStatement statement = generated.statement();
        // The generated root and every line belong to the account that generated them.
        Long owner = ownership.currentUserId();
        statement.setUserId(owner);
        statement.getLines().forEach(line -> line.setUserId(owner));
        statement.setPdfPath(storage.storePdf(pdfName(month, leaseId, version, ""), generated.pdf()));
        statement.setFullPdfPath(storage.storePdf(pdfName(month, leaseId, version, "_complet"),
                generated.completePdf()));
        ExpenseStatement saved = repository.saveAndFlush(statement);
        // Generating clears the draft of the same scope in the same transaction: a
        // generated statement never leaves an active draft behind.
        documentDraftService.deleteActiveStatement(saved.getCompanyId(), saved.getMonth(), saved.getLeaseId());
        return toDto(saved);
    }

    /** Stored PDF names embed the lease so two leases of a month never overwrite each other. */
    private String pdfName(YearMonth month, Long leaseId, int version, String suffix) {
        return "note_frais_" + month + "_l" + (leaseId == null ? 0 : leaseId) + "_v" + version + suffix + ".pdf";
    }

    @Transactional(readOnly = true)
    public List<StatementDto> list(Long companyId, String month, Long leaseId) {
        companies.entity(companyId);
        Long owner = ownership.currentUserId();
        var lease = leaseId == null ? null : leases.resolveExpenseLease(companyId, leaseId);
        List<ExpenseStatement> statements = month == null || month.isBlank()
                ? repository.findByUserIdAndCompanyIdOrderByMonthDescVersionDesc(owner, companyId)
                : repository.findByUserIdAndCompanyIdAndMonthOrderByVersionDesc(owner, companyId,
                        Amounts.month(month).toString());
        return statements.stream()
                .filter(statement -> lease == null || statement.getLeaseId() == null
                        || statement.getLeaseId().equals(lease.getId()))
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public StatementDto get(Long id) {
        return toDto(entity(id));
    }

    @Transactional(readOnly = true)
    public ExpenseStatement entity(Long id) {
        return repository.findWithLinesByIdAndUserId(id, ownership.currentUserId())
                .orElseThrow(() -> new NotFoundException("STATEMENT_NOT_FOUND", "Note de frais introuvable."));
    }

    /**
     * Returns the DTO of the active statement for the company and month, mapped inside the
     * transaction: {@code spring.jpa.open-in-view} is disabled, so the entity cannot be mapped
     * by the controller without initializing its lazy lines. Without a lease the historical
     * company scope is used; legacy statements with no lease stay reachable.
     */
    @Transactional(readOnly = true)
    public Optional<StatementDto> activeDtoForMonth(Long companyId, String month, Long leaseId) {
        companies.entity(companyId);
        Long owner = ownership.currentUserId();
        if (leaseId == null) {
            return repository
                    .findFirstByUserIdAndCompanyIdAndMonthAndStatusOrderByVersionDesc(owner, companyId, month,
                            DocumentStatus.ACTIVE)
                    .map(this::toDto);
        }
        Long effectiveLeaseId = leases.resolveExpenseLease(companyId, leaseId).getId();
        return repository
                .findFirstByUserIdAndCompanyIdAndMonthAndLeaseIdAndStatusOrderByVersionDesc(owner, companyId, month,
                        effectiveLeaseId, DocumentStatus.ACTIVE)
                .map(this::toDto);
    }

    public byte[] pdf(Long id, boolean complete) {
        return documents.pdf(entity(id), complete);
    }

    public byte[] zip(Long id) {
        return documents.zip(entity(id));
    }

    private int nextVersion(Long companyId, String month, Long leaseId) {
        Long owner = ownership.currentUserId();
        Optional<ExpenseStatement> last = leaseId == null
                ? repository.findFirstByUserIdAndCompanyIdAndMonthAndLeaseIdIsNullOrderByVersionDesc(owner,
                        companyId, month)
                : repository.findFirstByUserIdAndCompanyIdAndMonthAndLeaseIdOrderByVersionDesc(owner, companyId,
                        month, leaseId);
        return last.map(statement -> statement.getVersion() + 1).orElse(1);
    }

    private RentReceipt activeReceipt(Long companyId, String month, Long leaseId) {
        return rentReceiptService.activeForLease(companyId, month, leaseId);
    }

    private void archive(Long companyId, String month, Long leaseId) {
        List<ExpenseStatement> existingStatements = repository
                .findByUserIdAndCompanyIdAndMonthOrderByVersionDesc(ownership.currentUserId(), companyId, month);
        boolean modified = false;
        for (ExpenseStatement existingStatement : existingStatements) {
            boolean sameScope = leaseId == null
                    ? existingStatement.getLeaseId() == null
                    : leaseId.equals(existingStatement.getLeaseId());
            if (sameScope && existingStatement.getStatus() == DocumentStatus.ACTIVE) {
                existingStatement.setStatus(DocumentStatus.ARCHIVED);
                modified = true;
            }
        }
        if (modified) {
            repository.saveAll(existingStatements);
            repository.flush();
        }
    }

    public StatementDto toDto(ExpenseStatement statement) {
        List<ExpenseLineDto> lines = statement.getLines().stream()
                .map(line -> new ExpenseLineDto(
                        line.getId(),
                        line.getExpenseItem().getCode(),
                        line.getExpenseItem().getLabel(),
                        line.getExpenseItem().getSupplier(),
                        Amounts.apiValue(line.getAmountInclVat()),
                        Amounts.apiValue(line.getMonthlyAmount()),
                        Amounts.apiValue(line.getProRataPct()),
                        Amounts.apiValue(line.getClaimedAmount()),
                        line.getReceipt() == null ? null : line.getReceipt().getId(),
                        line.getReceipt() == null ? null : line.getReceipt().getFileName(),
                        line.getAmountSource().name(),
                        Amounts.apiValue(line.getAiDetectedAmount()),
                        line.getAiConfidence()))
                .toList();
        String companyName = companies.find(statement.getCompanyId())
                .map(Company::getName)
                .orElse(null);
        return new StatementDto(
                statement.getId(),
                statement.getCompanyId(),
                statement.getLeaseId(),
                companyName,
                statement.getMonth(),
                statement.getNumber(),
                Amounts.apiValue(statement.getTotal()),
                statement.getVersion(),
                statement.getStatus().name(),
                statement.getTemplateId(),
                statement.getTemplateName(),
                statement.getTemplateVersion(),
                statement.getCreatedAt(),
                lines,
                statement.getPdfPath() != null,
                statement.getFullPdfPath() != null);
    }
}
