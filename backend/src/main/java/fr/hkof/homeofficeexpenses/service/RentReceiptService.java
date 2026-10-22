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
    private final PdfService pdfService;
    private final StorageService stockage;
    private final Clock clock;

    public RentReceiptService(RentReceiptRepository repository, SettingsService parametersService,
            TemplateService templateService, TemplateDataService templateDataService, PdfService pdfService,
            StorageService stockage, Clock clock) {
        this.repository = repository;
        this.parametersService = parametersService;
        this.templateService = templateService;
        this.templateDataService = templateDataService;
        this.pdfService = pdfService;
        this.stockage = stockage;
        this.clock = clock;
    }

    @Transactional
    public RentReceiptDto generer(RentReceiptRequest request) {
        YearMonth month = Amounts.month(request.month());
        Settings parameters = parametersService.entity();
        LocalDate debut = dateOu(request.periodStart(), month.atDay(1));
        LocalDate fin = dateOu(request.periodEnd(), month.atEndOfMonth());
        if (fin.isBefore(debut)) {
            throw new BusinessException("La fin de période ne peut pas précéder le début.");
        }
        BigDecimal loyer = request.rentExclCharges() == null || request.rentExclCharges().isBlank()
                ? parameters.getRentExclCharges()
                : Amounts.decimal(request.rentExclCharges(), "loyer hors charges", false);
        if (loyer == null) {
            throw new BusinessException("Renseignez le loyer hors charges dans la configuration.");
        }
        BigDecimal charges = request.charges() == null || request.charges().isBlank()
                ? (parameters.getChargesAdvance() == null ? BigDecimal.ZERO : parameters.getChargesAdvance())
                : Amounts.decimal(request.charges(), "provision pour charges", false);
        BigDecimal total = CalculationService.totalRentReceipt(loyer, charges);
        LocalDate emission = dateOu(request.issueDate(), LocalDate.now(clock));
        LocalDate paiement = dateOu(request.paymentDate(), LocalDate.now(clock));

        TemplateDocument template = templateService.active(TemplateType.RENT_RECEIPT);
        if (request.templateId() != null) {
            template = templateService.parId(request.templateId());
            if (template.getType() != TemplateType.RENT_RECEIPT) {
                throw new BusinessException("Le template sélectionné n'est pas un template de quittance.");
            }
        }

        int version = repository.findFirstByMonthOrderByVersionDesc(month.toString())
                .map(q -> q.getVersion() + 1)
                .orElse(1);
        archiver(month.toString());

        RentReceipt rentReceipt = new RentReceipt();
        rentReceipt.setMonth(month.toString());
        rentReceipt.setPeriodStart(debut);
        rentReceipt.setPeriodEnd(fin);
        rentReceipt.setRentExclCharges(loyer);
        rentReceipt.setCharges(charges);
        rentReceipt.setTotal(total);
        rentReceipt.setPaymentDate(paiement);
        rentReceipt.setIssueDate(emission);
        rentReceipt.setVersion(version);
        rentReceipt.setStatus(DocumentStatus.ACTIVE);
        rentReceipt.setTemplateId(template.getId());
        rentReceipt.setTemplateName(template.getName());
        rentReceipt.setTemplateVersion(template.getVersion());
        rentReceipt.setCreatedAt(Instant.now(clock));

        String html = templateService.rendre(template, templateDataService.dataRentReceipt(parameters, rentReceipt));
        byte[] pdf = pdfService.rendreHtmlEnPdf(html);
        String path = stockage.stockerPdf("quittance_" + month + "_v" + version + ".pdf", pdf);
        rentReceipt.setPdfPath(path);
        return versDto(repository.save(rentReceipt));
    }

    @Transactional(readOnly = true)
    public byte[] apercu(RentReceiptRequest request) {
        YearMonth month = Amounts.month(request.month());
        Settings parameters = parametersService.entity();
        LocalDate debut = dateOu(request.periodStart(), month.atDay(1));
        LocalDate fin = dateOu(request.periodEnd(), month.atEndOfMonth());
        if (fin.isBefore(debut)) {
            throw new BusinessException("La fin de période ne peut pas précéder le début.");
        }
        BigDecimal loyer = request.rentExclCharges() == null || request.rentExclCharges().isBlank()
                ? parameters.getRentExclCharges()
                : Amounts.decimal(request.rentExclCharges(), "loyer hors charges", false);
        if (loyer == null) {
            throw new BusinessException("Renseignez le loyer hors charges dans la configuration.");
        }
        BigDecimal charges = request.charges() == null || request.charges().isBlank()
                ? (parameters.getChargesAdvance() == null ? BigDecimal.ZERO : parameters.getChargesAdvance())
                : Amounts.decimal(request.charges(), "provision pour charges", false);
        RentReceipt rentReceipt = new RentReceipt();
        rentReceipt.setMonth(month.toString());
        rentReceipt.setPeriodStart(debut);
        rentReceipt.setPeriodEnd(fin);
        rentReceipt.setRentExclCharges(loyer);
        rentReceipt.setCharges(charges);
        rentReceipt.setTotal(CalculationService.totalRentReceipt(loyer, charges));
        rentReceipt.setIssueDate(dateOu(request.issueDate(), LocalDate.now(clock)));
        rentReceipt.setPaymentDate(dateOu(request.paymentDate(), LocalDate.now(clock)));
        TemplateDocument template = request.templateId() == null
                ? templateService.active(TemplateType.RENT_RECEIPT)
                : templateService.parId(request.templateId());
        if (template.getType() != TemplateType.RENT_RECEIPT) {
            throw new BusinessException("Le template sélectionné n'est pas un template de quittance.");
        }
        String html = templateService.rendre(template, templateDataService.dataRentReceipt(parameters, rentReceipt));
        return pdfService.addWatermark(pdfService.rendreHtmlEnPdf(html));
    }

    @Transactional(readOnly = true)
    public List<RentReceiptDto> lister(String month) {
        List<RentReceipt> rentReceipts = month == null || month.isBlank()
                ? repository.findAllByOrderByMonthDescVersionDesc()
                : repository.findByMonthOrderByVersionDesc(Amounts.month(month).toString());
        return rentReceipts.stream().map(this::versDto).toList();
    }

    @Transactional(readOnly = true)
    public RentReceiptDto obtenir(Long id) {
        return versDto(entity(id));
    }

    @Transactional(readOnly = true)
    public RentReceipt entity(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Quittance introuvable."));
    }

    @Transactional(readOnly = true)
    public RentReceipt activePourMonth(String month) {
        return repository.findFirstByMonthAndStatusOrderByVersionDesc(month, DocumentStatus.ACTIVE).orElse(null);
    }

    public byte[] pdf(Long id) {
        RentReceipt rentReceipt = entity(id);
        if (rentReceipt.getPdfPath() == null) {
            throw new NotFoundException("Le PDF de cette quittance est introuvable.");
        }
        return stockage.lire(rentReceipt.getPdfPath());
    }

    private void archiver(String month) {
        List<RentReceipt> existantes = repository.findByMonthOrderByVersionDesc(month);
        boolean modifie = false;
        for (RentReceipt existante : existantes) {
            if (existante.getStatus() == DocumentStatus.ACTIVE) {
                existante.setStatus(DocumentStatus.ARCHIVED);
                modifie = true;
            }
        }
        if (modifie) {
            repository.saveAll(existantes);
            repository.flush();
        }
    }

    private LocalDate dateOu(String date, LocalDate defaut) {
        LocalDate parsee = Amounts.dateOptionnelle(date, "date");
        return parsee == null ? defaut : parsee;
    }

    public RentReceiptDto versDto(RentReceipt q) {
        return new RentReceiptDto(
                q.getId(),
                q.getMonth(),
                q.getPeriodStart(),
                q.getPeriodEnd(),
                Amounts.apiValue(q.getRentExclCharges()),
                Amounts.apiValue(q.getCharges()),
                Amounts.apiValue(q.getTotal()),
                q.getPaymentDate(),
                q.getIssueDate(),
                q.getVersion(),
                q.getStatus().name(),
                q.getTemplateId(),
                q.getTemplateName(),
                q.getTemplateVersion(),
                q.getCreatedAt(),
                q.getPdfPath() != null);
    }
}
