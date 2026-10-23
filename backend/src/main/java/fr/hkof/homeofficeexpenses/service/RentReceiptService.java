package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Settings;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.SignatureType;
import fr.hkof.homeofficeexpenses.domain.DocumentStatus;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.repository.RentReceiptRepository;
import fr.hkof.homeofficeexpenses.service.template.TemplateDataService;
import fr.hkof.homeofficeexpenses.service.template.TemplateService;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.RentReceiptDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.RentReceiptRequest;

@Service
public class RentReceiptService {

    private final RentReceiptRepository repository;
    private final SettingsService parametersService;
    private final TemplateService templateService;
    private final TemplateDataService templateDataService;
    private final SignatureService signatureService;
    private final PdfService pdfService;
    private final StorageService storage;
    private final Clock clock;

    public RentReceiptService(RentReceiptRepository repository, SettingsService parametersService,
            TemplateService templateService, TemplateDataService templateDataService, SignatureService signatureService,
            PdfService pdfService, StorageService storage, Clock clock) {
        this.repository = repository;
        this.parametersService = parametersService;
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
        Settings parameters = parametersService.entity();
        LocalDate periodStart = dateOr(request.periodStart(), month.atDay(1));
        LocalDate periodEnd = dateOr(request.periodEnd(), month.atEndOfMonth());
        if (periodEnd.isBefore(periodStart)) {
            throw new BusinessException("La fin de période ne peut pas précéder le début.");
        }
        BigDecimal rentExclCharges = request.rentExclCharges() == null || request.rentExclCharges().isBlank()
                ? parameters.getRentExclCharges()
                : Amounts.decimal(request.rentExclCharges(), "loyer hors charges", false);
        if (rentExclCharges == null) {
            throw new BusinessException("Renseignez le loyer hors charges dans la configuration.");
        }
        BigDecimal charges = request.charges() == null || request.charges().isBlank()
                ? (parameters.getChargesAdvance() == null ? BigDecimal.ZERO : parameters.getChargesAdvance())
                : Amounts.decimal(request.charges(), "provision pour charges", false);
        BigDecimal total = CalculationService.totalRentReceipt(rentExclCharges, charges);
        LocalDate issueDate = dateOr(request.issueDate(), LocalDate.now(clock));
        LocalDate paymentDate = dateOr(request.paymentDate(), LocalDate.now(clock));
        String signature = signatureDataUri(request.signatureId(), SignatureType.LANDLORD);

        TemplateDocument template = templateService.active(TemplateType.RENT_RECEIPT);
        if (request.templateId() != null) {
            template = templateService.byId(request.templateId());
            if (template.getType() != TemplateType.RENT_RECEIPT) {
                throw new BusinessException("Le template sélectionné n'est pas un template de quittance.");
            }
        }

        int version = repository.findFirstByMonthOrderByVersionDesc(month.toString())
                .map(existing -> existing.getVersion() + 1)
                .orElse(1);
        archive(month.toString());

        RentReceipt rentReceipt = new RentReceipt();
        rentReceipt.setMonth(month.toString());
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

        String html = templateService.render(template, templateDataService.dataRentReceipt(parameters, rentReceipt, signature));
        byte[] pdf = pdfService.renderHtmlToPdf(html);
        String path = storage.storePdf("quittance_" + month + "_v" + version + ".pdf", pdf);
        rentReceipt.setPdfPath(path);
        return toDto(repository.save(rentReceipt));
    }

    @Transactional(readOnly = true)
    public byte[] preview(RentReceiptRequest request) {
        YearMonth month = Amounts.month(request.month());
        Settings parameters = parametersService.entity();
        LocalDate periodStart = dateOr(request.periodStart(), month.atDay(1));
        LocalDate periodEnd = dateOr(request.periodEnd(), month.atEndOfMonth());
        if (periodEnd.isBefore(periodStart)) {
            throw new BusinessException("La fin de période ne peut pas précéder le début.");
        }
        BigDecimal rentExclCharges = request.rentExclCharges() == null || request.rentExclCharges().isBlank()
                ? parameters.getRentExclCharges()
                : Amounts.decimal(request.rentExclCharges(), "loyer hors charges", false);
        if (rentExclCharges == null) {
            throw new BusinessException("Renseignez le loyer hors charges dans la configuration.");
        }
        BigDecimal charges = request.charges() == null || request.charges().isBlank()
                ? (parameters.getChargesAdvance() == null ? BigDecimal.ZERO : parameters.getChargesAdvance())
                : Amounts.decimal(request.charges(), "provision pour charges", false);
        RentReceipt rentReceipt = new RentReceipt();
        rentReceipt.setMonth(month.toString());
        rentReceipt.setPeriodStart(periodStart);
        rentReceipt.setPeriodEnd(periodEnd);
        rentReceipt.setRentExclCharges(rentExclCharges);
        rentReceipt.setCharges(charges);
        rentReceipt.setTotal(CalculationService.totalRentReceipt(rentExclCharges, charges));
        rentReceipt.setIssueDate(dateOr(request.issueDate(), LocalDate.now(clock)));
        rentReceipt.setPaymentDate(dateOr(request.paymentDate(), LocalDate.now(clock)));
        String signature = signatureDataUri(request.signatureId(), SignatureType.LANDLORD);
        TemplateDocument template = request.templateId() == null
                ? templateService.active(TemplateType.RENT_RECEIPT)
                : templateService.byId(request.templateId());
        if (template.getType() != TemplateType.RENT_RECEIPT) {
            throw new BusinessException("Le template sélectionné n'est pas un template de quittance.");
        }
        String html = templateService.render(template, templateDataService.dataRentReceipt(parameters, rentReceipt, signature));
        return pdfService.addWatermark(pdfService.renderHtmlToPdf(html));
    }

    @Transactional(readOnly = true)
    public List<RentReceiptDto> list(String month) {
        List<RentReceipt> rentReceipts = month == null || month.isBlank()
                ? repository.findAllByOrderByMonthDescVersionDesc()
                : repository.findByMonthOrderByVersionDesc(Amounts.month(month).toString());
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

    @Transactional(readOnly = true)
    public RentReceipt activeForMonth(String month) {
        return repository.findFirstByMonthAndStatusOrderByVersionDesc(month, DocumentStatus.ACTIVE).orElse(null);
    }

    public byte[] pdf(Long id) {
        RentReceipt rentReceipt = entity(id);
        if (rentReceipt.getPdfPath() == null) {
            throw new NotFoundException("Le PDF de cette quittance est introuvable.");
        }
        return storage.read(rentReceipt.getPdfPath());
    }

    private void archive(String month) {
        List<RentReceipt> existingReceipts = repository.findByMonthOrderByVersionDesc(month);
        boolean modified = false;
        for (RentReceipt existingReceipt : existingReceipts) {
            if (existingReceipt.getStatus() == DocumentStatus.ACTIVE) {
                existingReceipt.setStatus(DocumentStatus.ARCHIVED);
                modified = true;
            }
        }
        if (modified) {
            repository.saveAll(existingReceipts);
            repository.flush();
        }
    }

    private LocalDate dateOr(String date, LocalDate fallback) {
        LocalDate parsed = Amounts.optionalDate(date, "date");
        return parsed == null ? fallback : parsed;
    }

    private String signatureDataUri(Long requestedId, SignatureType defaultType) {
        Signature signature = signatureService.resolve(requestedId, defaultType)
                .orElseThrow(() -> new BusinessException(
                        "Aucune signature configurée. Configurez une signature dans la page Paramètres."));
        return signatureService.dataUri(signature.getId());
    }

    public RentReceiptDto toDto(RentReceipt rentReceipt) {
        return new RentReceiptDto(
                rentReceipt.getId(),
                rentReceipt.getMonth(),
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
