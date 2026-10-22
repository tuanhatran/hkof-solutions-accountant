package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Receipt;
import fr.hkof.homeofficeexpenses.domain.ExpenseLine;
import fr.hkof.homeofficeexpenses.domain.ExpenseStatement;
import fr.hkof.homeofficeexpenses.domain.Settings;
import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.AmountSource;
import fr.hkof.homeofficeexpenses.domain.DocumentStatus;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.repository.ExpenseStatementRepository;
import fr.hkof.homeofficeexpenses.service.extraction.DocumentTextExtractor;
import fr.hkof.homeofficeexpenses.service.template.TemplateDataService;
import fr.hkof.homeofficeexpenses.service.template.TemplateService;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.DraftDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.CalculationResponse;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.ExpenseLineDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.ExpenseLineRequest;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.StatementPreviewRequest;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.StatementCalculationRequest;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.StatementDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.StatementGenerationRequest;

@Service
public class ExpenseStatementService {

    private static final List<String> CONFIANCE = List.of("haute", "moyenne", "basse");

    private final ExpenseStatementRepository repository;
    private final SettingsService parametersService;
    private final ExpenseItemService expenseItemService;
    private final RentReceiptService rentReceiptService;
    private final ReceiptService receiptService;
    private final TemplateService templateService;
    private final TemplateDataService templateDataService;
    private final PdfService pdfService;
    private final StorageService stockage;
    private final DocumentTextExtractor extracteur;
    private final Clock clock;

    public ExpenseStatementService(ExpenseStatementRepository repository, SettingsService parametersService,
            ExpenseItemService expenseItemService, RentReceiptService rentReceiptService, ReceiptService receiptService,
            TemplateService templateService, TemplateDataService templateDataService, PdfService pdfService,
            StorageService stockage, DocumentTextExtractor extracteur, Clock clock) {
        this.repository = repository;
        this.parametersService = parametersService;
        this.expenseItemService = expenseItemService;
        this.rentReceiptService = rentReceiptService;
        this.receiptService = receiptService;
        this.templateService = templateService;
        this.templateDataService = templateDataService;
        this.pdfService = pdfService;
        this.stockage = stockage;
        this.extracteur = extracteur;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public CalculationResponse calculate(StatementCalculationRequest request) {
        YearMonth month = Amounts.month(request.month());
        List<CalculatedLine> lines = calculateLines(request.lines(), month);
        Settings p = parametersService.entity();
        BigDecimal total = CalculationService.total(lines.stream().map(CalculatedLine::claimedAmount).toList());
        return new CalculationResponse(
                lines.stream().map(this::versDto).toList(),
                Amounts.apiValue(total),
                NumberToWords.enLettres(total),
                Amounts.apiValue(CalculationService.proRataBase(p.getBusinessArea(), p.getTotalArea())),
                templateDataService.detailProrata(p));
    }

    @Transactional(readOnly = true)
    public DraftDto draft(String monthText) {
        YearMonth month = Amounts.month(monthText);
        Settings p = parametersService.entity();
        RentReceipt rentReceipt = rentReceiptService.activePourMonth(month.toString());
        List<ExpenseLineDto> lines = new ArrayList<>();
        if (rentReceipt != null) {
            ExpenseItem loyer = expenseItemService.entity("loyer");
            lines.add(new ExpenseLineDto(
                    null, loyer.getCode(), loyer.getLabel(), loyer.getSupplier(), null, null,
                    Amounts.apiValue(rentReceipt.getTotal()),
                    Amounts.apiValue(rentReceipt.getTotal()),
                    "100.00",
                    Amounts.apiValue(rentReceipt.getTotal()),
                    null, null, AmountSource.MANUAL.name(), null, null));
        }
        List<String> missing = expenseItemService.lister(false).stream()
                .filter(expenseItem -> !expenseItem.code().equals("loyer"))
                .map(expenseItem -> expenseItem.label().toLowerCase(Locale.FRENCH))
                .toList();
        return new DraftDto(
                month.toString(),
                rentReceipt == null ? null : rentReceiptService.versDto(rentReceipt),
                lines,
                Amounts.apiValue(CalculationService.proRataBase(p.getBusinessArea(), p.getTotalArea())),
                templateDataService.detailProrata(p),
                missing);
    }

    @Transactional(readOnly = true)
    public byte[] apercu(StatementPreviewRequest request) {
        YearMonth month = Amounts.month(request.month());
        List<CalculatedLine> lines = calculateLines(request.lines(), month);
        Settings p = parametersService.entity();
        ExpenseStatement statement = construireStatement(month, lines, null, null);
        boolean complete = Boolean.TRUE.equals(request.complete());
        TemplateDocument template = templatePourStatement(request.templateId());
        String html = templateService.rendre(template, templateDataService.dataStatement(p, statement, complete));
        byte[] pdf = pdfService.rendreHtmlEnPdf(html);
        if (complete) {
            pdf = pdfService.fusionner(avecAnnexes(pdf, statement, month));
        }
        return pdfService.addWatermark(pdf);
    }

    @Transactional
    public StatementDto generer(StatementGenerationRequest request) {
        YearMonth month = Amounts.month(request.month());
        List<CalculatedLine> lines = calculateLines(request.lines(), month);
        if (lines.isEmpty()) {
            throw new BusinessException("Ajoutez au moins un frais avant de générer la note.");
        }
        Settings p = parametersService.entity();
        TemplateDocument template = templatePourStatement(request.templateId());
        int version = repository.findFirstByMonthOrderByVersionDesc(month.toString())
                .map(n -> n.getVersion() + 1)
                .orElse(1);
        archiver(month.toString());
        ExpenseStatement statement = construireStatement(month, lines, version, template);
        String html = templateService.rendre(template, templateDataService.dataStatement(p, statement, true));
        byte[] pdf = pdfService.rendreHtmlEnPdf(html);
        byte[] pdfComplete = pdfService.fusionner(avecAnnexes(pdf, statement, month));
        statement.setPdfPath(stockage.stockerPdf("note_frais_" + month + "_v" + version + ".pdf", pdf));
        statement.setFullPdfPath(stockage.stockerPdf("note_frais_" + month + "_v" + version + "_complet.pdf", pdfComplete));
        ExpenseStatement saved = repository.saveAndFlush(statement);
        return versDto(saved);
    }

    @Transactional(readOnly = true)
    public List<StatementDto> lister(String month) {
        List<ExpenseStatement> statements = month == null || month.isBlank()
                ? repository.findAllByOrderByMonthDescVersionDesc()
                : repository.findByMonthOrderByVersionDesc(Amounts.month(month).toString());
        return statements.stream().map(this::versDto).toList();
    }

    @Transactional(readOnly = true)
    public StatementDto obtenir(Long id) {
        return versDto(entity(id));
    }

    @Transactional(readOnly = true)
    public ExpenseStatement entity(Long id) {
        return repository.findWithLinesById(id)
                .orElseThrow(() -> new NotFoundException("Note de frais introuvable."));
    }

    @Transactional(readOnly = true)
    public ExpenseStatement activePourMonth(String month) {
        return repository.findFirstByMonthAndStatusOrderByVersionDesc(month, DocumentStatus.ACTIVE).orElse(null);
    }

    public byte[] pdf(Long id, boolean complete) {
        ExpenseStatement statement = entity(id);
        String path = complete ? statement.getFullPdfPath() : statement.getPdfPath();
        if (path == null) {
            throw new NotFoundException("Le PDF demandé est introuvable.");
        }
        return stockage.lire(path);
    }

    private List<CalculatedLine> calculateLines(List<ExpenseLineRequest> demandes, YearMonth month) {
        if (demandes == null || demandes.isEmpty()) {
            return List.of();
        }
        List<CalculatedLine> result = new ArrayList<>();
        Set<String> codes = new HashSet<>();
        for (ExpenseLineRequest request : demandes) {
            if (request.itemCode() == null || request.itemCode().isBlank()) {
                throw new BusinessException("Le type de frais est obligatoire.");
            }
            ExpenseItem expenseItem = expenseItemService.entity(request.itemCode());
            if (!expenseItem.isMultipleLinesAllowed() && !codes.add(expenseItem.getCode())) {
                throw new BusinessException("Le type « " + expenseItem.getLabel() + " » ne peut être ajouté qu'une fois.");
            }
            BigDecimal amountInclVat = Amounts.decimal(request.amountInclVat(), "montant TTC", true);
            BigDecimal prorata = Amounts.pourcentage(request.proRataPct());
            LocalDate debut = Amounts.dateOptionnelle(request.periodStart(), "début de période");
            LocalDate fin = Amounts.dateOptionnelle(request.periodEnd(), "fin de période");
            if ((debut == null) != (fin == null)) {
                throw new BusinessException("Renseignez les deux dates de la période facturée, ou aucune.");
            }
            BigDecimal monthlyAmount = request.monthlyAmountOverride() == null || request.monthlyAmountOverride().isBlank()
                    ? CalculationService.ventilerSurMonth(amountInclVat, debut, fin, month)
                    : Amounts.decimal(request.monthlyAmountOverride(), "montant du mois", false);
            BigDecimal retenu = CalculationService.claimedAmount(monthlyAmount, prorata);
            Receipt receipt = request.receiptId() == null
                    ? null
                    : receiptService.entity(request.receiptId());
            AmountSource source = amountSource(request.amountSource());
            BigDecimal detectedAmount = Amounts.decimalOptionnel(request.aiDetectedAmount(), "montant détecté par IA");
            String confidence = confidence(request.aiConfidence());
            result.add(new CalculatedLine(expenseItem, amountInclVat, debut, fin, monthlyAmount, prorata, retenu,
                    receipt, source, detectedAmount, confidence));
        }
        return result;
    }

    private ExpenseStatement construireStatement(YearMonth month, List<CalculatedLine> lines, Integer version,
            TemplateDocument template) {
        ExpenseStatement statement = new ExpenseStatement();
        statement.setMonth(month.toString());
        statement.setNumber("NF-" + month);
        statement.setVersion(version == null ? 1 : version);
        statement.setStatus(DocumentStatus.ACTIVE);
        if (template != null) {
            statement.setTemplateId(template.getId());
            statement.setTemplateName(template.getName());
            statement.setTemplateVersion(template.getVersion());
        }
        statement.setCreatedAt(Instant.now(clock));
        BigDecimal total = BigDecimal.ZERO;
        for (CalculatedLine calculated : lines) {
            ExpenseLine line = new ExpenseLine();
            line.setExpenseItem(calculated.expenseItem());
            line.setAmountInclVat(calculated.amountInclVat());
            line.setPeriodStart(calculated.debut());
            line.setPeriodEnd(calculated.fin());
            line.setMonthlyAmount(calculated.monthlyAmount());
            line.setProRataPct(calculated.prorata());
            line.setClaimedAmount(calculated.claimedAmount());
            line.setReceipt(calculated.receipt());
            line.setAmountSource(calculated.source());
            line.setAiDetectedAmount(calculated.detectedAmount());
            line.setAiConfidence(calculated.confidence());
            line.setLabelSnapshot(calculated.expenseItem().getLabel());
            line.setSupplierSnapshot(calculated.expenseItem().getSupplier());
            statement.addLine(line);
            total = total.add(calculated.claimedAmount());
        }
        statement.setTotal(total.setScale(2, java.math.RoundingMode.HALF_UP));
        return statement;
    }

    private List<byte[]> avecAnnexes(byte[] statementPdf, ExpenseStatement statement, YearMonth month) {
        List<byte[]> pdfs = new ArrayList<>();
        pdfs.add(statementPdf);
        RentReceipt rentReceipt = rentReceiptService.activePourMonth(month.toString());
        if (rentReceipt != null && rentReceipt.getPdfPath() != null) {
            pdfs.add(stockage.lire(rentReceipt.getPdfPath()));
        }
        Set<Long> deja = new HashSet<>();
        for (ExpenseLine line : statement.getLines()) {
            Receipt receipt = line.getReceipt();
            if (receipt == null || !deja.add(receipt.getId())) {
                continue;
            }
            byte[] content = stockage.lire(receipt.getPath());
            if (receipt.getMimeType().equals("application/pdf")) {
                pdfs.add(content);
            } else if (receipt.getMimeType().startsWith("image/")) {
                pdfs.add(pdfService.imageVersPdf(content, receipt.getFileName()));
            } else {
                DocumentTextExtractor.Extraction extraction = extracteur.extraire(
                        Path.of(stockage.pathTemporaire(receipt.getFileName(), content)),
                        receipt.getMimeType(), 1);
                pdfs.add(pdfService.pageText("Justificatif — " + receipt.getFileName(), extraction.text()));
            }
        }
        return pdfs;
    }

    private TemplateDocument templatePourStatement(Long templateId) {
        TemplateDocument template = templateId == null
                ? templateService.active(TemplateType.EXPENSE_STATEMENT)
                : templateService.parId(templateId);
        if (template.getType() != TemplateType.EXPENSE_STATEMENT) {
            throw new BusinessException("Le template sélectionné n'est pas un template de note de frais.");
        }
        return template;
    }

    private void archiver(String month) {
        List<ExpenseStatement> existantes = repository.findByMonthOrderByVersionDesc(month);
        boolean modifie = false;
        for (ExpenseStatement existante : existantes) {
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

    private AmountSource amountSource(String value) {
        if (value == null || value.isBlank()) {
            return AmountSource.MANUAL;
        }
        try {
            return AmountSource.valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Source de montant invalide : " + value);
        }
    }

    private String confidence(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalisee = value.trim().toLowerCase(Locale.ROOT);
        if (!CONFIANCE.contains(normalisee)) {
            throw new BusinessException("Niveau de confiance IA invalide : " + value);
        }
        return normalisee;
    }

    public ExpenseLineDto versDto(CalculatedLine line) {
        return new ExpenseLineDto(
                null,
                line.expenseItem().getCode(),
                line.expenseItem().getLabel(),
                line.expenseItem().getSupplier(),
                line.debut(),
                line.fin(),
                Amounts.apiValue(line.amountInclVat()),
                Amounts.apiValue(line.monthlyAmount()),
                Amounts.apiValue(line.prorata()),
                Amounts.apiValue(line.claimedAmount()),
                line.receipt() == null ? null : line.receipt().getId(),
                line.receipt() == null ? null : line.receipt().getFileName(),
                line.source().name(),
                Amounts.apiValue(line.detectedAmount()),
                line.confidence());
    }

    public StatementDto versDto(ExpenseStatement statement) {
        List<ExpenseLineDto> lines = statement.getLines().stream()
                .map(line -> new ExpenseLineDto(
                        line.getId(),
                        line.getExpenseItem().getCode(),
                        line.getExpenseItem().getLabel(),
                        line.getExpenseItem().getSupplier(),
                        line.getPeriodStart(),
                        line.getPeriodEnd(),
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
        return new StatementDto(
                statement.getId(),
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

    private record CalculatedLine(
            ExpenseItem expenseItem,
            BigDecimal amountInclVat,
            LocalDate debut,
            LocalDate fin,
            BigDecimal monthlyAmount,
            BigDecimal prorata,
            BigDecimal claimedAmount,
            Receipt receipt,
            AmountSource source,
            BigDecimal detectedAmount,
            String confidence) {
    }
}
