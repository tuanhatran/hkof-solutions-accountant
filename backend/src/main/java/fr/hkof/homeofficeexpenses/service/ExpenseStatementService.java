package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
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

    private static final List<String> CONFIDENCE_LEVELS = List.of("haute", "moyenne", "basse");

    private final ExpenseStatementRepository repository;
    private final SettingsService parametersService;
    private final ExpenseItemService expenseItemService;
    private final RentReceiptService rentReceiptService;
    private final ReceiptService receiptService;
    private final TemplateService templateService;
    private final TemplateDataService templateDataService;
    private final PdfService pdfService;
    private final StorageService storage;
    private final DocumentTextExtractor textExtractor;
    private final Clock clock;

    public ExpenseStatementService(ExpenseStatementRepository repository, SettingsService parametersService,
            ExpenseItemService expenseItemService, RentReceiptService rentReceiptService, ReceiptService receiptService,
            TemplateService templateService, TemplateDataService templateDataService, PdfService pdfService,
            StorageService storage, DocumentTextExtractor textExtractor, Clock clock) {
        this.repository = repository;
        this.parametersService = parametersService;
        this.expenseItemService = expenseItemService;
        this.rentReceiptService = rentReceiptService;
        this.receiptService = receiptService;
        this.templateService = templateService;
        this.templateDataService = templateDataService;
        this.pdfService = pdfService;
        this.storage = storage;
        this.textExtractor = textExtractor;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public CalculationResponse calculate(StatementCalculationRequest request) {
        YearMonth month = Amounts.month(request.month());
        List<CalculatedLine> lines = calculateLines(request.lines());
        Settings settings = parametersService.entity();
        BigDecimal total = CalculationService.total(lines.stream().map(CalculatedLine::claimedAmount).toList());
        return new CalculationResponse(
                lines.stream().map(this::toDto).toList(),
                Amounts.apiValue(total),
                NumberToWords.toWords(total),
                Amounts.apiValue(CalculationService.proRataBase(settings.getBusinessArea(), settings.getTotalArea())),
                templateDataService.proRataDetail(settings));
    }

    @Transactional(readOnly = true)
    public DraftDto draft(String monthText) {
        YearMonth month = Amounts.month(monthText);
        Settings settings = parametersService.entity();
        RentReceipt rentReceipt = rentReceiptService.activeForMonth(month.toString());
        List<ExpenseLineDto> lines = new ArrayList<>();
        if (rentReceipt != null) {
            ExpenseItem rentItem = expenseItemService.entity("loyer");
            lines.add(new ExpenseLineDto(
                    null, rentItem.getCode(), rentItem.getLabel(), rentItem.getSupplier(),
                    Amounts.apiValue(rentReceipt.getTotal()),
                    Amounts.apiValue(rentReceipt.getTotal()),
                    "100.00",
                    Amounts.apiValue(rentReceipt.getTotal()),
                    null, null, AmountSource.MANUAL.name(), null, null));
        }
        List<String> missing = expenseItemService.list(false).stream()
                .filter(expenseItem -> !expenseItem.code().equals("loyer"))
                .map(expenseItem -> expenseItem.label().toLowerCase(Locale.FRENCH))
                .toList();
        return new DraftDto(
                month.toString(),
                rentReceipt == null ? null : rentReceiptService.toDto(rentReceipt),
                lines,
                Amounts.apiValue(CalculationService.proRataBase(settings.getBusinessArea(), settings.getTotalArea())),
                templateDataService.proRataDetail(settings),
                missing);
    }

    @Transactional(readOnly = true)
    public byte[] preview(StatementPreviewRequest request) {
        YearMonth month = Amounts.month(request.month());
        List<CalculatedLine> lines = calculateLines(request.lines());
        Settings settings = parametersService.entity();
        ExpenseStatement statement = buildStatement(month, lines, null, null);
        boolean complete = Boolean.TRUE.equals(request.complete());
        TemplateDocument template = templateForStatement(request.templateId());
        String html = templateService.render(template, templateDataService.dataStatement(settings, statement, complete));
        byte[] pdf = pdfService.renderHtmlToPdf(html);
        if (complete) {
            pdf = pdfService.merge(withAttachments(pdf, statement, month));
        }
        return pdfService.addWatermark(pdf);
    }

    @Transactional
    public StatementDto generate(StatementGenerationRequest request) {
        YearMonth month = Amounts.month(request.month());
        List<CalculatedLine> lines = calculateLines(request.lines());
        if (lines.isEmpty()) {
            throw new BusinessException("Ajoutez au moins un frais avant de générer la note.");
        }
        Settings settings = parametersService.entity();
        TemplateDocument template = templateForStatement(request.templateId());
        int version = repository.findFirstByMonthOrderByVersionDesc(month.toString())
                .map(n -> n.getVersion() + 1)
                .orElse(1);
        archive(month.toString());
        ExpenseStatement statement = buildStatement(month, lines, version, template);
        String html = templateService.render(template, templateDataService.dataStatement(settings, statement, true));
        byte[] pdf = pdfService.renderHtmlToPdf(html);
        byte[] pdfComplete = pdfService.merge(withAttachments(pdf, statement, month));
        statement.setPdfPath(storage.storePdf("note_frais_" + month + "_v" + version + ".pdf", pdf));
        statement.setFullPdfPath(storage.storePdf("note_frais_" + month + "_v" + version + "_complet.pdf", pdfComplete));
        ExpenseStatement saved = repository.saveAndFlush(statement);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<StatementDto> list(String month) {
        List<ExpenseStatement> statements = month == null || month.isBlank()
                ? repository.findAllByOrderByMonthDescVersionDesc()
                : repository.findByMonthOrderByVersionDesc(Amounts.month(month).toString());
        return statements.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public StatementDto get(Long id) {
        return toDto(entity(id));
    }

    @Transactional(readOnly = true)
    public ExpenseStatement entity(Long id) {
        return repository.findWithLinesById(id)
                .orElseThrow(() -> new NotFoundException("Note de frais introuvable."));
    }

    /**
     * Returns the DTO of the active statement for the month, mapped inside the transaction:
     * {@code spring.jpa.open-in-view} is disabled, so the entity cannot be mapped by the
     * controller without initializing its lazy lines.
     */
    @Transactional(readOnly = true)
    public Optional<StatementDto> activeDtoForMonth(String month) {
        return repository.findFirstByMonthAndStatusOrderByVersionDesc(month, DocumentStatus.ACTIVE)
                .map(this::toDto);
    }

    public byte[] pdf(Long id, boolean complete) {
        ExpenseStatement statement = entity(id);
        String path = complete ? statement.getFullPdfPath() : statement.getPdfPath();
        if (path == null) {
            throw new NotFoundException("Le PDF demandé est introuvable.");
        }
        return storage.read(path);
    }

    private List<CalculatedLine> calculateLines(List<ExpenseLineRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return List.of();
        }
        List<CalculatedLine> calculatedLines = new ArrayList<>();
        Set<String> codes = new HashSet<>();
        for (ExpenseLineRequest request : requests) {
            if (request.itemCode() == null || request.itemCode().isBlank()) {
                throw new BusinessException("Le type de frais est obligatoire.");
            }
            ExpenseItem expenseItem = expenseItemService.entity(request.itemCode());
            if (!expenseItem.isMultipleLinesAllowed() && !codes.add(expenseItem.getCode())) {
                throw new BusinessException("Le type « " + expenseItem.getLabel() + " » ne peut être ajouté qu'une fois.");
            }
            BigDecimal amountInclVat = Amounts.decimal(request.amountInclVat(), "montant TTC", true);
            BigDecimal proRataPct = Amounts.percentage(request.proRataPct());
            BigDecimal monthlyAmount = CalculationService.monthlyAmount(amountInclVat);
            BigDecimal claimedAmount = CalculationService.claimedAmount(monthlyAmount, proRataPct);
            Receipt receipt = request.receiptId() == null
                    ? null
                    : receiptService.entity(request.receiptId());
            AmountSource source = amountSource(request.amountSource());
            BigDecimal detectedAmount = Amounts.optionalDecimal(request.aiDetectedAmount(), "montant détecté par IA");
            String confidence = confidence(request.aiConfidence());
            calculatedLines.add(new CalculatedLine(expenseItem, amountInclVat, monthlyAmount, proRataPct, claimedAmount,
                    receipt, source, detectedAmount, confidence));
        }
        // The configured display order is authoritative, stable for equal sortOrder
        // and for a repeated item. Amounts stay attached to their own line.
        calculatedLines.sort(Comparator.comparingInt(line -> line.expenseItem().getSortOrder()));
        return calculatedLines;
    }

    private ExpenseStatement buildStatement(YearMonth month, List<CalculatedLine> lines, Integer version,
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
            line.setMonthlyAmount(calculated.monthlyAmount());
            line.setProRataPct(calculated.proRataPct());
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

    private List<byte[]> withAttachments(byte[] statementPdf, ExpenseStatement statement, YearMonth month) {
        List<byte[]> pdfs = new ArrayList<>();
        pdfs.add(statementPdf);
        RentReceipt rentReceipt = rentReceiptService.activeForMonth(month.toString());
        if (rentReceipt != null && rentReceipt.getPdfPath() != null) {
            pdfs.add(storage.read(rentReceipt.getPdfPath()));
        }
        Set<Long> processedReceiptIds = new HashSet<>();
        for (ExpenseLine line : statement.getLines()) {
            Receipt receipt = line.getReceipt();
            if (receipt == null || !processedReceiptIds.add(receipt.getId())) {
                continue;
            }
            byte[] content = storage.read(receipt.getPath());
            if (receipt.getMimeType().equals("application/pdf")) {
                pdfs.add(content);
            } else if (receipt.getMimeType().startsWith("image/")) {
                pdfs.add(pdfService.imageToPdf(content, receipt.getFileName()));
            } else {
                DocumentTextExtractor.Extraction extraction = textExtractor.extract(
                        Path.of(storage.temporaryPath(receipt.getFileName(), content)),
                        receipt.getMimeType(), 1);
                pdfs.add(pdfService.pageText("Justificatif — " + receipt.getFileName(), extraction.text()));
            }
        }
        return pdfs;
    }

    private TemplateDocument templateForStatement(Long templateId) {
        TemplateDocument template = templateId == null
                ? templateService.active(TemplateType.EXPENSE_STATEMENT)
                : templateService.byId(templateId);
        if (template.getType() != TemplateType.EXPENSE_STATEMENT) {
            throw new BusinessException("Le template sélectionné n'est pas un template de note de frais.");
        }
        return template;
    }

    private void archive(String month) {
        List<ExpenseStatement> existingStatements = repository.findByMonthOrderByVersionDesc(month);
        boolean modified = false;
        for (ExpenseStatement existingStatement : existingStatements) {
            if (existingStatement.getStatus() == DocumentStatus.ACTIVE) {
                existingStatement.setStatus(DocumentStatus.ARCHIVED);
                modified = true;
            }
        }
        if (modified) {
            repository.saveAll(existingStatements);
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
        String normalizedConfidence = value.trim().toLowerCase(Locale.ROOT);
        if (!CONFIDENCE_LEVELS.contains(normalizedConfidence)) {
            throw new BusinessException("Niveau de confiance IA invalide : " + value);
        }
        return normalizedConfidence;
    }

    public ExpenseLineDto toDto(CalculatedLine line) {
        return new ExpenseLineDto(
                null,
                line.expenseItem().getCode(),
                line.expenseItem().getLabel(),
                line.expenseItem().getSupplier(),
                Amounts.apiValue(line.amountInclVat()),
                Amounts.apiValue(line.monthlyAmount()),
                Amounts.apiValue(line.proRataPct()),
                Amounts.apiValue(line.claimedAmount()),
                line.receipt() == null ? null : line.receipt().getId(),
                line.receipt() == null ? null : line.receipt().getFileName(),
                line.source().name(),
                Amounts.apiValue(line.detectedAmount()),
                line.confidence());
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
            BigDecimal monthlyAmount,
            BigDecimal proRataPct,
            BigDecimal claimedAmount,
            Receipt receipt,
            AmountSource source,
            BigDecimal detectedAmount,
            String confidence) {
    }
}
