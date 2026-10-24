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
import fr.hkof.homeofficeexpenses.domain.DocumentStatus;
import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.ExpenseStatement;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.Settings;
import fr.hkof.homeofficeexpenses.domain.SignatureType;
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
 * calculator and the document collaborator. Public behaviour is unchanged.
 */
@Service
public class ExpenseStatementService {

    private final ExpenseStatementRepository repository;
    private final SettingsService parametersService;
    private final ExpenseItemService expenseItemService;
    private final RentReceiptService rentReceiptService;
    private final TemplateDataService templateDataService;
    private final StorageService storage;
    private final ExpenseStatementLineCalculator lineCalculator;
    private final ExpenseStatementDocumentService documents;

    public ExpenseStatementService(ExpenseStatementRepository repository, SettingsService parametersService,
            ExpenseItemService expenseItemService, RentReceiptService rentReceiptService,
            TemplateDataService templateDataService, StorageService storage,
            ExpenseStatementLineCalculator lineCalculator, ExpenseStatementDocumentService documents) {
        this.repository = repository;
        this.parametersService = parametersService;
        this.expenseItemService = expenseItemService;
        this.rentReceiptService = rentReceiptService;
        this.templateDataService = templateDataService;
        this.storage = storage;
        this.lineCalculator = lineCalculator;
        this.documents = documents;
    }

    @Transactional(readOnly = true)
    public CalculationResponse calculate(StatementCalculationRequest request) {
        YearMonth month = Amounts.month(request.month());
        List<CalculatedLine> lines = lineCalculator.calculateLines(request.lines());
        Settings settings = parametersService.entity();
        BigDecimal total = CalculationService.total(lines.stream().map(CalculatedLine::claimedAmount).toList());
        return new CalculationResponse(
                lines.stream().map(lineCalculator::toDto).toList(),
                Amounts.apiValue(total),
                NumberToWords.toWords(total),
                Amounts.apiValue(CalculationService.proRataBase(settings.getBusinessArea(), settings.getTotalArea())),
                templateDataService.proRataDetail(settings));
    }

    @Transactional(readOnly = true)
    public DraftDto draft(String monthText) {
        YearMonth month = Amounts.month(monthText);
        Settings settings = parametersService.entity();
        // Expense statements keep a month-scoped rent receipt: pair selection is out of scope.
        RentReceipt rentReceipt = rentReceiptService.activeForMonth(month.toString(), null, null);
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
        List<CalculatedLine> lines = lineCalculator.calculateLines(request.lines());
        Settings settings = parametersService.entity();
        return documents.preview(month, lines, settings, request);
    }

    @Transactional
    public StatementDto generate(StatementGenerationRequest request) {
        YearMonth month = Amounts.month(request.month());
        List<CalculatedLine> lines = lineCalculator.calculateLines(request.lines());
        if (lines.isEmpty()) {
            throw new BusinessException("Ajoutez au moins un frais avant de générer la note.");
        }
        Settings settings = parametersService.entity();
        String signature = documents.signatureDataUri(request.signatureId(), SignatureType.ENTREPRISE_CEO);
        TemplateDocument template = documents.templateForStatement(request.templateId());
        int version = repository.findFirstByMonthOrderByVersionDesc(month.toString())
                .map(n -> n.getVersion() + 1)
                .orElse(1);
        archive(month.toString());
        ExpenseStatementDocumentService.GeneratedStatement generated =
                documents.generate(month, lines, version, template, signature, settings);
        ExpenseStatement statement = generated.statement();
        statement.setPdfPath(storage.storePdf("note_frais_" + month + "_v" + version + ".pdf", generated.pdf()));
        statement.setFullPdfPath(
                storage.storePdf("note_frais_" + month + "_v" + version + "_complet.pdf", generated.completePdf()));
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
        return documents.pdf(entity(id), complete);
    }

    public byte[] zip(Long id) {
        return documents.zip(entity(id));
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
}
