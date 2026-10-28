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
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.repository.RentReceiptRepository;
import fr.hkof.homeofficeexpenses.service.template.TemplateDataService;
import fr.hkof.homeofficeexpenses.service.template.TemplateService;
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
    private final RentReceiptMapper mapper;
    private final Clock clock;

    public RentReceiptService(RentReceiptRepository repository, CompanyService companies, LeaseService leaseService,
            TemplateService templateService, TemplateDataService templateDataService,
            SignatureService signatureService, PdfService pdfService, StorageService storage, RentReceiptMapper mapper,
            Clock clock) {
        this.repository = repository;
        this.companies = companies;
        this.leaseService = leaseService;
        this.templateService = templateService;
        this.templateDataService = templateDataService;
        this.signatureService = signatureService;
        this.pdfService = pdfService;
        this.storage = storage;
        this.mapper = mapper;
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
        BigDecimal total = CalculationService.totalRentReceipt(rentExclCharges, charges);
        String signature = signatureDataUri(request.signatureId(), lease.getLandlord().getId());
        TemplateDocument template = template(request.templateId());
        int version = nextVersion(month, lease);

        RentReceipt rentReceipt = new RentReceipt();
        fill(rentReceipt, company, lease, month, periodStart, periodEnd, rentExclCharges, charges, total);
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
        String path = storage.storePdf(fileName(month, lease, version), pdf);
        rentReceipt.setPdfPath(path);
        return toDto(repository.save(rentReceipt));
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
        RentReceipt rentReceipt = new RentReceipt();
        fill(rentReceipt, company, lease, month, periodStart, periodEnd, rentExclCharges, charges,
                CalculationService.totalRentReceipt(rentExclCharges, charges));
        rentReceipt.setIssueDate(dateOr(request.issueDate(), LocalDate.now(clock)));
        rentReceipt.setPaymentDate(dateOr(request.paymentDate(), LocalDate.now(clock)));
        String signature = signatureDataUri(request.signatureId(), lease.getLandlord().getId());
        TemplateDocument template = template(request.templateId());
        String html = templateService.render(template, templateDataService.dataRentReceipt(
                company, lease.getLandlord(), lease.getTenant(), tenantCompany(lease), lease, rentReceipt, signature));
        return pdfService.addWatermark(pdfService.renderHtmlToPdf(html));
    }

    @Transactional(readOnly = true)
    public List<RentReceiptDto> list(Long companyId, String month) {
        boolean hasMonth = month != null && !month.isBlank();
        String monthValue = hasMonth ? Amounts.month(month).toString() : null;
        List<RentReceipt> rentReceipts;
        if (companyId != null) {
            companies.entity(companyId);
            rentReceipts = hasMonth
                    ? repository.findByCompanyIdAndMonthOrderByVersionDescIdDesc(companyId, monthValue)
                    : repository.findByCompanyIdOrderByMonthDescVersionDescIdDesc(companyId);
        } else {
            rentReceipts = hasMonth
                    ? repository.findByMonthOrderByVersionDescIdDesc(monthValue)
                    : repository.findAllByOrderByMonthDescVersionDescIdDesc();
        }
        return rentReceipts.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public RentReceiptDto get(Long id) {
        return toDto(entity(id));
    }

    @Transactional(readOnly = true)
    public RentReceipt entity(Long id) {
        return repository.findById(id)
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
        if (landlordId != null && tenantCompanyId != null) {
            return repository
                    .findFirstByMonthAndLandlordIdAndTenantCompanyIdAndStatusOrderByVersionDescIdDesc(
                            month, landlordId, tenantCompanyId, DocumentStatus.ACTIVE)
                    .orElse(null);
        }
        if (landlordId != null && tenantId != null) {
            return repository
                    .findFirstByMonthAndLandlordIdAndTenantIdAndStatusOrderByVersionDescIdDesc(
                            month, landlordId, tenantId, DocumentStatus.ACTIVE)
                    .orElse(null);
        }
        if (companyId != null) {
            return repository
                    .findFirstByCompanyIdAndMonthAndStatusOrderByVersionDescIdDesc(
                            companyId, month, DocumentStatus.ACTIVE)
                    .orElse(null);
        }
        return repository.findFirstByMonthAndStatusOrderByVersionDescIdDesc(month, DocumentStatus.ACTIVE)
                .orElse(null);
    }

    public byte[] pdf(Long id) {
        RentReceipt rentReceipt = entity(id);
        if (rentReceipt.getPdfPath() == null) {
            throw new NotFoundException("RENT_RECEIPT_PDF_NOT_FOUND", "Le PDF de cette quittance est introuvable.");
        }
        return storage.read(rentReceipt.getPdfPath());
    }

    private void fill(RentReceipt rentReceipt, Company company, Lease lease, YearMonth month,
            LocalDate periodStart, LocalDate periodEnd, BigDecimal rentExclCharges, BigDecimal charges,
            BigDecimal total) {
        rentReceipt.setCompanyId(company == null ? null : company.getId());
        rentReceipt.setMonth(month.toString());
        rentReceipt.setLandlordId(lease.getLandlord().getId());
        rentReceipt.setTenantId(lease.isCompanyLease() || lease.getTenant() == null ? null
                : lease.getTenant().getId());
        rentReceipt.setTenantCompanyId(lease.isCompanyLease() ? lease.getCompanyId() : null);
        rentReceipt.setPeriodStart(periodStart);
        rentReceipt.setPeriodEnd(periodEnd);
        rentReceipt.setRentExclCharges(rentExclCharges);
        rentReceipt.setCharges(charges);
        rentReceipt.setTotal(total);
    }

    private int nextVersion(YearMonth month, Lease lease) {
        var existing = lease.isCompanyLease()
                ? repository.findFirstByMonthAndLandlordIdAndTenantCompanyIdOrderByVersionDescIdDesc(
                        month.toString(), lease.getLandlord().getId(), lease.getCompanyId())
                : repository.findFirstByMonthAndLandlordIdAndTenantIdOrderByVersionDescIdDesc(
                        month.toString(), lease.getLandlord().getId(), lease.getTenant().getId());
        return existing.map(receipt -> receipt.getVersion() + 1).orElse(1);
    }

    private String fileName(YearMonth month, Lease lease, int version) {
        String tenant = lease.isCompanyLease()
                ? "c" + lease.getCompanyId()
                : "t" + lease.getTenant().getId();
        return "quittance_" + month + "_l" + lease.getLandlord().getId() + "_" + tenant + "_v" + version + ".pdf";
    }

    private TemplateDocument template(Long templateId) {
        TemplateDocument template = templateId != null
                ? templateService.byId(templateId)
                : templateService.active(TemplateType.RENT_RECEIPT);
        if (template.getType() != TemplateType.RENT_RECEIPT) {
            throw new BusinessException("RENT_RECEIPT_TEMPLATE_INVALID",
                    "Le template sélectionné n'est pas un template de quittance.");
        }
        return template;
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
