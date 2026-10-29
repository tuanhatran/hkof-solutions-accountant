package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.DocumentStatus;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.repository.RentReceiptRepository;
import fr.hkof.homeofficeexpenses.service.template.TemplateDataService;
import fr.hkof.homeofficeexpenses.service.template.TemplateService;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.AdditionalCharge;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.RentReceiptDto;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.RentReceiptRequest;

@Service
public class RentReceiptService {

    private final RentReceiptRepository repository;
    private final CompanyService companies;
    private final LeaseService leaseService;
    private final TemplateService templateService;
    private final TemplateDataService templateDataService;
    private final SignatureService signatureService;
    private final PdfService pdfService;
    private final StorageService storage;
    private final DocumentDraftService documentDraftService;
    private final RentReceiptMapper mapper;
    private final RentReceiptAssembler assembler;
    private final OwnershipContext ownership;
    private final Clock clock;

    public RentReceiptService(RentReceiptRepository repository, CompanyService companies, LeaseService leaseService,
            TemplateService templateService, TemplateDataService templateDataService,
            SignatureService signatureService, PdfService pdfService, StorageService storage,
            DocumentDraftService documentDraftService, RentReceiptMapper mapper,
            RentReceiptAssembler assembler, OwnershipContext ownership,
            Clock clock) {
        this.repository = repository;
        this.companies = companies;
        this.leaseService = leaseService;
        this.templateService = templateService;
        this.templateDataService = templateDataService;
        this.signatureService = signatureService;
        this.pdfService = pdfService;
        this.storage = storage;
        this.documentDraftService = documentDraftService;
        this.mapper = mapper;
        this.assembler = assembler;
        this.ownership = ownership;
        this.clock = clock;
    }

    @Transactional
    public RentReceiptDto generate(RentReceiptRequest request) {
        YearMonth month = Amounts.month(request.month());
        Lease lease = leaseService.resolveLease(request.landlordId(), request.tenantId(), request.tenantCompanyId());
        Company company = resolveCompany(lease, request.companyId());
        LocalDate periodStart = dateOr(request.periodStart(), month.atDay(1));
        LocalDate periodEnd = dateOr(request.periodEnd(), month.atEndOfMonth());
        checkPeriod(periodStart, periodEnd);
        BigDecimal rentExclCharges = rentExclCharges(request, lease);
        BigDecimal charges = charges(request, lease);
        List<AdditionalCharge> additionalCharges = RentReceiptAdditionalCharges
                .normalize(request.additionalCharges());
        BigDecimal total = CalculationService.totalRentReceipt(rentExclCharges, charges,
                RentReceiptAdditionalCharges.amounts(additionalCharges));
        String signature = signatureDataUri(request.signatureId(), lease.getLandlord().getId());
        TemplateDocument template = assembler.template(request.templateId());
        int version = assembler.nextVersion(month, lease);

        RentReceipt rentReceipt = new RentReceipt();
        assembler.fill(rentReceipt, company, lease, month, periodStart, periodEnd, rentExclCharges, charges, total,
                additionalCharges);
        rentReceipt.setPaymentDate(dateOr(request.paymentDate(), LocalDate.now(clock)));
        rentReceipt.setIssueDate(dateOr(request.issueDate(), LocalDate.now(clock)));
        rentReceipt.setVersion(version);
        rentReceipt.setStatus(DocumentStatus.ACTIVE);
        rentReceipt.setTemplateId(template.getId());
        rentReceipt.setTemplateName(template.getName());
        rentReceipt.setTemplateVersion(template.getVersion());
        rentReceipt.setCreatedAt(Instant.now(clock));

        String html = templateService.render(template, templateDataService.dataRentReceipt(
                company, lease.getLandlord(), lease.getTenant(), tenantCompany(lease), lease, rentReceipt, signature));
        byte[] pdf = pdfService.renderHtmlToPdf(html);
        String path = storage.storePdf(assembler.fileName(month, lease, version), pdf);
        rentReceipt.setPdfPath(path);
        RentReceipt saved = repository.save(rentReceipt);
        // Generating clears the draft of the same scope in the same transaction: a
        // generated receipt never leaves an active draft behind.
        documentDraftService.deleteActiveRentReceipt(saved.getMonth(), saved.getLandlordId(),
                saved.getTenantId(), saved.getTenantCompanyId());
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public byte[] preview(RentReceiptRequest request) {
        YearMonth month = Amounts.month(request.month());
        Lease lease = leaseService.resolveLease(request.landlordId(), request.tenantId(), request.tenantCompanyId());
        Company company = resolveCompany(lease, request.companyId());
        LocalDate periodStart = dateOr(request.periodStart(), month.atDay(1));
        LocalDate periodEnd = dateOr(request.periodEnd(), month.atEndOfMonth());
        checkPeriod(periodStart, periodEnd);
        BigDecimal rentExclCharges = rentExclCharges(request, lease);
        BigDecimal charges = charges(request, lease);
        List<AdditionalCharge> additionalCharges = RentReceiptAdditionalCharges
                .normalize(request.additionalCharges());
        RentReceipt rentReceipt = new RentReceipt();
        assembler.fill(rentReceipt, company, lease, month, periodStart, periodEnd, rentExclCharges, charges,
                CalculationService.totalRentReceipt(rentExclCharges, charges,
                        RentReceiptAdditionalCharges.amounts(additionalCharges)),
                additionalCharges);
        rentReceipt.setIssueDate(dateOr(request.issueDate(), LocalDate.now(clock)));
        rentReceipt.setPaymentDate(dateOr(request.paymentDate(), LocalDate.now(clock)));
        String signature = signatureDataUri(request.signatureId(), lease.getLandlord().getId());
        TemplateDocument template = assembler.template(request.templateId());
        String html = templateService.render(template, templateDataService.dataRentReceipt(
                company, lease.getLandlord(), lease.getTenant(), tenantCompany(lease), lease, rentReceipt, signature));
        return pdfService.addWatermark(pdfService.renderHtmlToPdf(html));
    }

    @Transactional(readOnly = true)
    public List<RentReceiptDto> list(Long companyId, String month) {
        boolean hasMonth = month != null && !month.isBlank();
        String monthValue = hasMonth ? Amounts.month(month).toString() : null;
        Long owner = ownership.currentUserId();
        List<RentReceipt> rentReceipts;
        if (companyId != null) {
            companies.entity(companyId);
            rentReceipts = hasMonth
                    ? repository.findByUserIdAndCompanyIdAndMonthOrderByVersionDescIdDesc(owner, companyId,
                            monthValue)
                    : repository.findByUserIdAndCompanyIdOrderByMonthDescVersionDescIdDesc(owner, companyId);
        } else {
            rentReceipts = hasMonth
                    ? repository.findByUserIdAndMonthOrderByVersionDescIdDesc(owner, monthValue)
                    : repository.findAllByUserIdOrderByMonthDescVersionDescIdDesc(owner);
        }
        return rentReceipts.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public RentReceiptDto get(Long id) {
        return toDto(entity(id));
    }

    @Transactional(readOnly = true)
    public RentReceipt entity(Long id) {
        return repository.findByIdAndUserId(id, ownership.currentUserId())
                .orElseThrow(() -> new NotFoundException("RENT_RECEIPT_NOT_FOUND", "Quittance introuvable."));
    }

    /**
     * Returns the latest ACTIVE receipt: for the exact tenant when a tenant reference is
     * given, otherwise for the company and month when a company is given, otherwise for the
     * month. The order is deterministic: highest version, then highest id.
     */
    @Transactional(readOnly = true)
    public RentReceipt activeForMonth(Long companyId, String month, Long landlordId, Long tenantId,
            Long tenantCompanyId) {
        Long owner = ownership.currentUserId();
        if (companyId != null) {
            companies.entity(companyId);
        }
        if (landlordId != null && tenantCompanyId != null) {
            return withAdditionalCharges(repository
                    .findFirstByUserIdAndMonthAndLandlordIdAndTenantCompanyIdAndStatusOrderByVersionDescIdDesc(
                            owner, month, landlordId, tenantCompanyId, DocumentStatus.ACTIVE)
                    .orElse(null));
        }
        if (landlordId != null && tenantId != null) {
            return withAdditionalCharges(repository
                    .findFirstByUserIdAndMonthAndLandlordIdAndTenantIdAndStatusOrderByVersionDescIdDesc(
                            owner, month, landlordId, tenantId, DocumentStatus.ACTIVE)
                    .orElse(null));
        }
        if (companyId != null) {
            return withAdditionalCharges(repository
                    .findFirstByUserIdAndCompanyIdAndMonthAndStatusOrderByVersionDescIdDesc(
                            owner, companyId, month, DocumentStatus.ACTIVE)
                    .orElse(null));
        }
        return withAdditionalCharges(repository.findFirstByUserIdAndMonthAndStatusOrderByVersionDescIdDesc(owner,
                month, DocumentStatus.ACTIVE).orElse(null));
    }

    /**
     * Active rent receipt scoped by an expense lease: the lease parties select the pair, and a
     * null lease keeps the legacy company + month scope.
     */
    @Transactional(readOnly = true)
    public RentReceipt activeForLease(Long companyId, String month, Long leaseId) {
        LeaseService.RentReceiptScope scope = LeaseService.rentReceiptScope(
                leaseId == null ? null : leaseService.resolveExpenseLease(companyId, leaseId));
        return scope == null
                ? activeForMonth(companyId, month, null, null, null)
                : activeForMonth(companyId, month, scope.landlordId(), scope.tenantId(), scope.tenantCompanyId());
    }

    /** Loads the additional charge rows while the session is open: the controller maps a detached receipt. */
    private RentReceipt withAdditionalCharges(RentReceipt rentReceipt) {
        if (rentReceipt != null) {
            rentReceipt.getAdditionalCharges().size();
        }
        return rentReceipt;
    }

    public byte[] pdf(Long id) {
        RentReceipt rentReceipt = entity(id);
        if (rentReceipt.getPdfPath() == null) {
            throw new NotFoundException("RENT_RECEIPT_PDF_NOT_FOUND", "Le PDF de cette quittance est introuvable.");
        }
        return storage.read(rentReceipt.getPdfPath());
    }

    /**
     * The lease company always wins. A person lease without a lease company may carry an
     * explicit request company, and otherwise has no company at all.
     */
    private Company resolveCompany(Lease lease, Long requestCompanyId) {
        Long companyId = lease.getCompanyId() != null ? lease.getCompanyId() : requestCompanyId;
        return companyId == null ? null : companies.entity(companyId);
    }

    private Company tenantCompany(Lease lease) {
        return lease.isCompanyLease() && lease.getCompanyId() != null
                ? companies.find(lease.getCompanyId()).orElse(null)
                : null;
    }

    private BigDecimal rentExclCharges(RentReceiptRequest request, Lease lease) {
        return request.rentExclCharges() == null || request.rentExclCharges().isBlank()
                ? lease.getRentExclCharges()
                : Amounts.decimal(request.rentExclCharges(), "loyer hors charges", false);
    }

    private BigDecimal charges(RentReceiptRequest request, Lease lease) {
        return request.charges() == null || request.charges().isBlank()
                ? lease.getCharges()
                : Amounts.decimal(request.charges(), "provision pour charges", false);
    }

    private void checkPeriod(LocalDate periodStart, LocalDate periodEnd) {
        if (periodEnd.isBefore(periodStart)) {
            throw new BusinessException("RENT_RECEIPT_PERIOD_INVALID",
                    "La fin de période ne peut pas précéder le début.");
        }
    }

    private LocalDate dateOr(String date, LocalDate fallback) {
        LocalDate parsed = Amounts.optionalDate(date, "date");
        return parsed == null ? fallback : parsed;
    }

    private String signatureDataUri(Long requestedId, Long landlordId) {
        Signature signature = signatureService.resolveForPerson(requestedId, landlordId)
                .orElseThrow(() -> new BusinessException("SIGNATURE_MISSING",
                        "Aucune signature configurée. Ajoutez une signature au bailleur dans la page LMNP."));
        return signatureService.dataUri(signature.getId());
    }

    public RentReceiptDto toDto(RentReceipt rentReceipt) {
        return mapper.toDto(rentReceipt);
    }
}
