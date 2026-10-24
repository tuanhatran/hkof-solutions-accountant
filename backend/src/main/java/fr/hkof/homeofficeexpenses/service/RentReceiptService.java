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
import fr.hkof.homeofficeexpenses.domain.Landlord;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.domain.Tenant;
import fr.hkof.homeofficeexpenses.repository.LandlordRepository;
import fr.hkof.homeofficeexpenses.repository.RentReceiptRepository;
import fr.hkof.homeofficeexpenses.repository.TenantRepository;
import fr.hkof.homeofficeexpenses.service.template.TemplateDataService;
import fr.hkof.homeofficeexpenses.service.template.TemplateService;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.RentReceiptDto;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.RentReceiptRequest;

@Service
public class RentReceiptService {

    private final RentReceiptRepository repository;
    private final CompanyService companies;
    private final RentConfigurationService rentConfigurationService;
    private final LandlordRepository landlordRepository;
    private final TenantRepository tenantRepository;
    private final TemplateService templateService;
    private final TemplateDataService templateDataService;
    private final SignatureService signatureService;
    private final PdfService pdfService;
    private final StorageService storage;
    private final Clock clock;

    public RentReceiptService(RentReceiptRepository repository, CompanyService companies,
            RentConfigurationService rentConfigurationService, LandlordRepository landlordRepository,
            TenantRepository tenantRepository, TemplateService templateService,
            TemplateDataService templateDataService, SignatureService signatureService,
            PdfService pdfService, StorageService storage, Clock clock) {
        this.repository = repository;
        this.companies = companies;
        this.rentConfigurationService = rentConfigurationService;
        this.landlordRepository = landlordRepository;
        this.tenantRepository = tenantRepository;
        this.templateService = templateService;
        this.templateDataService = templateDataService;
        this.signatureService = signatureService;
        this.pdfService = pdfService;
        this.storage = storage;
        this.clock = clock;
    }

    @Transactional
    public RentReceiptDto generate(RentReceiptRequest request) {
        YearMonth month = Amounts.month(request.month());
        Lease lease = rentConfigurationService.resolveLease(request.landlordId(), request.tenantId());
        Company company = resolveCompany(lease, request.companyId());
        LocalDate periodStart = dateOr(request.periodStart(), month.atDay(1));
        LocalDate periodEnd = dateOr(request.periodEnd(), month.atEndOfMonth());
        if (periodEnd.isBefore(periodStart)) {
            throw new BusinessException("La fin de période ne peut pas précéder le début.");
        }
        BigDecimal rentExclCharges = request.rentExclCharges() == null || request.rentExclCharges().isBlank()
                ? lease.getRentExclCharges()
                : Amounts.decimal(request.rentExclCharges(), "loyer hors charges", false);
        BigDecimal charges = request.charges() == null || request.charges().isBlank()
                ? lease.getCharges()
                : Amounts.decimal(request.charges(), "provision pour charges", false);
        BigDecimal total = CalculationService.totalRentReceipt(rentExclCharges, charges);
        LocalDate issueDate = dateOr(request.issueDate(), LocalDate.now(clock));
        LocalDate paymentDate = dateOr(request.paymentDate(), LocalDate.now(clock));
        String signature = signatureDataUri(request.signatureId(), lease.getLandlord().getId());

        TemplateDocument template = templateService.active(TemplateType.RENT_RECEIPT);
        if (request.templateId() != null) {
            template = templateService.byId(request.templateId());
            if (template.getType() != TemplateType.RENT_RECEIPT) {
                throw new BusinessException("Le template sélectionné n'est pas un template de quittance.");
            }
        }

        // Versions are per landlord and tenant pair: every generation is a new ACTIVE
        // receipt, even for an identical month and pair.
        int version = repository.findFirstByMonthAndLandlordIdAndTenantIdOrderByVersionDescIdDesc(
                month.toString(), lease.getLandlord().getId(), lease.getTenant().getId())
                .map(existing -> existing.getVersion() + 1)
                .orElse(1);

        RentReceipt rentReceipt = new RentReceipt();
        rentReceipt.setCompanyId(company.getId());
        rentReceipt.setMonth(month.toString());
        rentReceipt.setLandlordId(lease.getLandlord().getId());
        rentReceipt.setTenantId(lease.getTenant().getId());
        rentReceipt.setPeriodStart(periodStart);
        rentReceipt.setPeriodEnd(periodEnd);
        rentReceipt.setRentExclCharges(rentExclCharges);
        rentReceipt.setCharges(charges);
        rentReceipt.setTotal(total);
        rentReceipt.setPaymentDate(paymentDate);
        rentReceipt.setIssueDate(issueDate);
        rentReceipt.setVersion(version);
        rentReceipt.setStatus(DocumentStatus.ACTIVE);
        rentReceipt.setTemplateId(template.getId());
        rentReceipt.setTemplateName(template.getName());
        rentReceipt.setTemplateVersion(template.getVersion());
        rentReceipt.setCreatedAt(Instant.now(clock));

        String html = templateService.render(template, templateDataService.dataRentReceipt(
                company, lease.getLandlord(), lease.getTenant(), lease, rentReceipt, signature));
        byte[] pdf = pdfService.renderHtmlToPdf(html);
        String path = storage.storePdf("quittance_" + month + "_l" + lease.getLandlord().getId()
                + "_t" + lease.getTenant().getId() + "_v" + version + ".pdf", pdf);
        rentReceipt.setPdfPath(path);
        return toDto(repository.save(rentReceipt));
    }

    @Transactional(readOnly = true)
    public byte[] preview(RentReceiptRequest request) {
        YearMonth month = Amounts.month(request.month());
        Lease lease = rentConfigurationService.resolveLease(request.landlordId(), request.tenantId());
        Company company = resolveCompany(lease, request.companyId());
        LocalDate periodStart = dateOr(request.periodStart(), month.atDay(1));
        LocalDate periodEnd = dateOr(request.periodEnd(), month.atEndOfMonth());
        if (periodEnd.isBefore(periodStart)) {
            throw new BusinessException("La fin de période ne peut pas précéder le début.");
        }
        BigDecimal rentExclCharges = request.rentExclCharges() == null || request.rentExclCharges().isBlank()
                ? lease.getRentExclCharges()
                : Amounts.decimal(request.rentExclCharges(), "loyer hors charges", false);
        BigDecimal charges = request.charges() == null || request.charges().isBlank()
                ? lease.getCharges()
                : Amounts.decimal(request.charges(), "provision pour charges", false);
        RentReceipt rentReceipt = new RentReceipt();
        rentReceipt.setCompanyId(company.getId());
        rentReceipt.setMonth(month.toString());
        rentReceipt.setLandlordId(lease.getLandlord().getId());
        rentReceipt.setTenantId(lease.getTenant().getId());
        rentReceipt.setPeriodStart(periodStart);
        rentReceipt.setPeriodEnd(periodEnd);
        rentReceipt.setRentExclCharges(rentExclCharges);
        rentReceipt.setCharges(charges);
        rentReceipt.setTotal(CalculationService.totalRentReceipt(rentExclCharges, charges));
        rentReceipt.setIssueDate(dateOr(request.issueDate(), LocalDate.now(clock)));
        rentReceipt.setPaymentDate(dateOr(request.paymentDate(), LocalDate.now(clock)));
        String signature = signatureDataUri(request.signatureId(), lease.getLandlord().getId());
        TemplateDocument template = request.templateId() == null
                ? templateService.active(TemplateType.RENT_RECEIPT)
                : templateService.byId(request.templateId());
        if (template.getType() != TemplateType.RENT_RECEIPT) {
            throw new BusinessException("Le template sélectionné n'est pas un template de quittance.");
        }
        String html = templateService.render(template, templateDataService.dataRentReceipt(
                company, lease.getLandlord(), lease.getTenant(), lease, rentReceipt, signature));
        return pdfService.addWatermark(pdfService.renderHtmlToPdf(html));
    }

    /**
     * Lists receipts, optionally filtered by company and month. A company filter keeps the
     * history of one company isolated from the others.
     */
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
                .orElseThrow(() -> new NotFoundException("Quittance introuvable."));
    }

    /**
     * Returns the latest ACTIVE receipt: for the pair when both identifiers are given,
     * otherwise for the company and month when a company is given, otherwise for the month.
     * The order is deterministic: highest version, then highest id.
     */
    @Transactional(readOnly = true)
    public RentReceipt activeForMonth(Long companyId, String month, Long landlordId, Long tenantId) {
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
            throw new NotFoundException("Le PDF de cette quittance est introuvable.");
        }
        return storage.read(rentReceipt.getPdfPath());
    }

    private Company resolveCompany(Lease lease, Long requestCompanyId) {
        Long companyId = lease.getCompanyId() != null ? lease.getCompanyId() : requestCompanyId;
        return companies.entity(companyId);
    }

    private LocalDate dateOr(String date, LocalDate fallback) {
        LocalDate parsed = Amounts.optionalDate(date, "date");
        return parsed == null ? fallback : parsed;
    }

    private String signatureDataUri(Long requestedId, Long landlordId) {
        Signature signature = signatureService.resolveForLandlord(requestedId, landlordId)
                .orElseThrow(() -> new BusinessException(
                        "Aucune signature configurée. Configurez une signature dans la page Paramètres."));
        return signatureService.dataUri(signature.getId());
    }

    public RentReceiptDto toDto(RentReceipt rentReceipt) {
        Landlord landlord = rentReceipt.getLandlordId() == null ? null
                : landlordRepository.findById(rentReceipt.getLandlordId()).orElse(null);
        Tenant tenant = rentReceipt.getTenantId() == null ? null
                : tenantRepository.findById(rentReceipt.getTenantId()).orElse(null);
        String companyName = rentReceipt.getCompanyId() == null ? null
                : companies.find(rentReceipt.getCompanyId()).map(Company::getName).orElse(null);
        return new RentReceiptDto(
                rentReceipt.getId(),
                rentReceipt.getCompanyId(),
                companyName,
                rentReceipt.getMonth(),
                rentReceipt.getLandlordId(),
                rentReceipt.getTenantId(),
                landlord == null ? null : landlord.getName(),
                tenant == null ? null : tenant.getName(),
                rentReceipt.getPeriodStart(),
                rentReceipt.getPeriodEnd(),
                Amounts.apiValue(rentReceipt.getRentExclCharges()),
                Amounts.apiValue(rentReceipt.getCharges()),
                Amounts.apiValue(rentReceipt.getTotal()),
                rentReceipt.getPaymentDate(),
                rentReceipt.getIssueDate(),
                rentReceipt.getVersion(),
                rentReceipt.getStatus().name(),
                rentReceipt.getTemplateId(),
                rentReceipt.getTemplateName(),
                rentReceipt.getTemplateVersion(),
                rentReceipt.getCreatedAt(),
                rentReceipt.getPdfPath() != null);
    }
}
