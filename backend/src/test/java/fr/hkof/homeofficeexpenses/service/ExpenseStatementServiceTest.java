package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.AmountSource;
import fr.hkof.homeofficeexpenses.domain.DocumentStatus;
import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.ExpenseLine;
import fr.hkof.homeofficeexpenses.domain.ExpenseStatement;
import fr.hkof.homeofficeexpenses.domain.Receipt;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.Settings;
import fr.hkof.homeofficeexpenses.domain.SignatureType;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.repository.ExpenseStatementRepository;
import fr.hkof.homeofficeexpenses.service.template.TemplateDataService;
import fr.hkof.homeofficeexpenses.web.dto.ExpenseItemDtos.ExpenseItemDto;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.RentReceiptDto;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.CalculationResponse;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.DraftDto;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.ExpenseLineRequest;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.StatementCalculationRequest;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.StatementDto;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.StatementGenerationRequest;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.StatementPreviewRequest;

class ExpenseStatementServiceTest {

    private ExpenseStatementRepository repository;
    private SettingsService settingsService;
    private ExpenseItemService expenseItemService;
    private RentReceiptService rentReceiptService;
    private TemplateDataService templateDataService;
    private StorageService storage;
    private ExpenseStatementLineCalculator lineCalculator;
    private ExpenseStatementDocumentService documents;
    private ExpenseStatementService service;

    @BeforeEach
    void setUp() {
        repository = mock(ExpenseStatementRepository.class);
        settingsService = mock(SettingsService.class);
        expenseItemService = mock(ExpenseItemService.class);
        rentReceiptService = mock(RentReceiptService.class);
        templateDataService = mock(TemplateDataService.class);
        storage = mock(StorageService.class);
        lineCalculator = mock(ExpenseStatementLineCalculator.class);
        documents = mock(ExpenseStatementDocumentService.class);
        service = new ExpenseStatementService(repository, settingsService, expenseItemService, rentReceiptService,
                templateDataService, storage, lineCalculator, documents);
    }

    private ExpenseItem item(String code, String label, int sortOrder) {
        ExpenseItem item = new ExpenseItem();
        item.setId((long) sortOrder);
        item.setCode(code);
        item.setLabel(label);
        item.setSupplier("Fournisseur");
        item.setSortOrder(sortOrder);
        return item;
    }

    private CalculatedLine calculatedLine(ExpenseItem item) {
        return new CalculatedLine(item, new BigDecimal("100.00"), new BigDecimal("100.00"),
                new BigDecimal("50.00"), new BigDecimal("50.00"), null, AmountSource.MANUAL, null, null);
    }

    private Settings settings() {
        Settings settings = new Settings();
        settings.setBusinessArea(new BigDecimal("25"));
        settings.setTotalArea(new BigDecimal("70"));
        return settings;
    }

    private StatementDto statementDto(ExpenseStatement statement, ExpenseLine... lines) {
        statement.setLines(List.of(lines));
        statement.setStatus(DocumentStatus.ACTIVE);
        return service.toDto(statement);
    }

    @Test
    @DisplayName("Calculation maps the lines, total, words and pro-rata detail")
    void calculate() {
        ExpenseItem gaz = item("gaz", "Gaz", 20);
        when(lineCalculator.calculateLines(any())).thenReturn(List.of(calculatedLine(gaz)));
        when(lineCalculator.toDto(any())).thenCallRealMethod();
        when(settingsService.entity()).thenReturn(settings());
        when(templateDataService.proRataDetail(any())).thenReturn("Surface pro 25 m² / 70 m² = 35,71 %");

        CalculationResponse response = service.calculate(new StatementCalculationRequest("2026-10", List.of()));

        assertThat(response.total()).isEqualTo("50.00");
        assertThat(response.totalInWords()).isEqualTo("cinquante euros");
        assertThat(response.proRataBase()).isEqualTo("35.71");
        assertThat(response.proRataBaseDetail()).contains("Surface pro");
    }

    @Test
    @DisplayName("A draft without rent receipt only lists missing items")
    void draftWithoutReceipt() {
        when(settingsService.entity()).thenReturn(settings());
        when(rentReceiptService.activeForMonth("2026-10", null, null)).thenReturn(null);
        when(expenseItemService.list(false)).thenReturn(List.of(
                new ExpenseItemDto(1L, "loyer", "Loyer", null, "100.00", "MONTHLY", true, 10, false),
                new ExpenseItemDto(2L, "gaz", "Gaz", "EDF", "35.71", "MONTHLY", true, 20, false)));
        when(templateDataService.proRataDetail(any())).thenReturn("détail");

        DraftDto draft = service.draft("2026-10");

        assertThat(draft.rentReceipt()).isNull();
        assertThat(draft.lines()).isEmpty();
        assertThat(draft.missingItems()).containsExactly("gaz");
        assertThat(draft.proRataBase()).isEqualTo("35.71");
    }

    @Test
    @DisplayName("A draft with a rent receipt prefills the rent line")
    void draftWithReceipt() {
        when(settingsService.entity()).thenReturn(settings());
        RentReceipt rentReceipt = new RentReceipt();
        rentReceipt.setTotal(new BigDecimal("950.00"));
        when(rentReceiptService.activeForMonth("2026-10", null, null)).thenReturn(rentReceipt);
        RentReceiptDto receiptDto = new RentReceiptDto(9L, "2026-10", 1L, 2L, "Bailleur", "Locataire", null, null,
                "900.00", "50.00", "950.00", null, null, 1, "ACTIVE", 1L, "Quittance", 1, null, true);
        when(rentReceiptService.toDto(rentReceipt)).thenReturn(receiptDto);
        when(expenseItemService.entity("loyer"))
                .thenReturn(item("loyer", "Quittance de loyer", 10));
        when(expenseItemService.list(false)).thenReturn(List.of(
                new ExpenseItemDto(1L, "loyer", "Loyer", null, "100.00", "MONTHLY", true, 10, false)));
        when(templateDataService.proRataDetail(any())).thenReturn("détail");

        DraftDto draft = service.draft("2026-10");

        assertThat(draft.rentReceipt()).isSameAs(receiptDto);
        assertThat(draft.lines()).hasSize(1);
        assertThat(draft.lines().get(0).itemCode()).isEqualTo("loyer");
        assertThat(draft.lines().get(0).claimedAmount()).isEqualTo("950.00");
        assertThat(draft.missingItems()).isEmpty();
    }

    @Test
    @DisplayName("Preview delegates to the document collaborator")
    void preview() {
        when(settingsService.entity()).thenReturn(settings());
        when(lineCalculator.calculateLines(any())).thenReturn(List.of());
        when(documents.preview(any(), any(), any(), any())).thenReturn(new byte[]{1});

        byte[] pdf = service.preview(new StatementPreviewRequest("2026-10", null, false, List.of(), null));

        assertThat(pdf).containsExactly(1);
        verify(documents).preview(eq(YearMonth.of(2026, 10)), any(), any(), any());
    }

    @Test
    @DisplayName("Generation requires at least one line")
    void generateRequiresLines() {
        when(lineCalculator.calculateLines(any())).thenReturn(List.of());
        assertThatThrownBy(() -> service.generate(new StatementGenerationRequest("2026-10", null, List.of(), null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ajoutez au moins un frais avant de générer la note.");
    }

    @Test
    @DisplayName("Generation archives active statements and stores both PDFs")
    void generate() {
        ExpenseItem gaz = item("gaz", "Gaz", 20);
        when(lineCalculator.calculateLines(any())).thenReturn(List.of(calculatedLine(gaz)));
        when(settingsService.entity()).thenReturn(settings());
        when(documents.signatureDataUri(null, SignatureType.ENTREPRISE_CEO)).thenReturn("signature");
        TemplateDocument template = new TemplateDocument();
        template.setId(4L);
        template.setName("Modèle");
        template.setVersion(2);
        when(documents.templateForStatement(null)).thenReturn(template);

        ExpenseStatement existing = new ExpenseStatement();
        existing.setStatus(DocumentStatus.ACTIVE);
        existing.setVersion(5);
        ExpenseStatement archivedAlready = new ExpenseStatement();
        archivedAlready.setStatus(DocumentStatus.ARCHIVED);
        when(repository.findFirstByMonthOrderByVersionDesc("2026-10")).thenReturn(Optional.of(existing));
        when(repository.findByMonthOrderByVersionDesc("2026-10"))
                .thenReturn(List.of(existing, archivedAlready));

        ExpenseStatement generated = new ExpenseStatement();
        generated.setMonth("2026-10");
        generated.setStatus(DocumentStatus.ACTIVE);
        generated.setLines(List.of());
        when(documents.generate(any(), any(), eq(6), eq(template), eq("signature"), any()))
                .thenReturn(new ExpenseStatementDocumentService.GeneratedStatement(generated, new byte[]{1},
                        new byte[]{2}));
        when(storage.storePdf(anyString(), any())).thenReturn("/data/note.pdf");
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> {
            ExpenseStatement saved = invocation.getArgument(0);
            saved.setId(20L);
            return saved;
        });

        StatementDto dto = service.generate(new StatementGenerationRequest("2026-10", null,
                List.of(new ExpenseLineRequest("gaz", "100", "50", null, null, null, null)), null));

        assertThat(dto.id()).isEqualTo(20L);
        assertThat(existing.getStatus()).isEqualTo(DocumentStatus.ARCHIVED);
        verify(repository).saveAll(List.of(existing, archivedAlready));
        verify(repository).flush();
        verify(storage).storePdf("note_frais_2026-10_v6.pdf", new byte[]{1});
        verify(storage).storePdf("note_frais_2026-10_v6_complet.pdf", new byte[]{2});
    }

    @Test
    @DisplayName("Generation without an active previous statement skips the archive flush")
    void generateWithoutArchive() {
        ExpenseItem gaz = item("gaz", "Gaz", 20);
        when(lineCalculator.calculateLines(any())).thenReturn(List.of(calculatedLine(gaz)));
        when(settingsService.entity()).thenReturn(settings());
        when(documents.signatureDataUri(null, SignatureType.ENTREPRISE_CEO)).thenReturn("signature");
        when(documents.templateForStatement(null)).thenReturn(new TemplateDocument());
        when(repository.findFirstByMonthOrderByVersionDesc("2026-10")).thenReturn(Optional.empty());
        when(repository.findByMonthOrderByVersionDesc("2026-10")).thenReturn(List.of());
        ExpenseStatement generated = new ExpenseStatement();
        generated.setMonth("2026-10");
        generated.setStatus(DocumentStatus.ACTIVE);
        generated.setLines(List.of());
        when(documents.generate(any(), any(), eq(1), any(), any(), any()))
                .thenReturn(new ExpenseStatementDocumentService.GeneratedStatement(generated, new byte[]{1},
                        new byte[]{2}));
        when(storage.storePdf(anyString(), any())).thenReturn("/data/note.pdf");
        when(repository.saveAndFlush(any())).thenReturn(generated);

        service.generate(new StatementGenerationRequest("2026-10", null,
                List.of(new ExpenseLineRequest("gaz", "100", "50", null, null, null, null)), null));

        verify(repository, never()).flush();
        verify(repository, never()).saveAll(any());
    }

    @Test
    @DisplayName("Listing filters by month or returns everything")
    void list() {
        ExpenseStatement statement = new ExpenseStatement();
        statement.setStatus(DocumentStatus.ACTIVE);
        statement.setLines(List.of());
        when(repository.findAllByOrderByMonthDescVersionDesc()).thenReturn(List.of(statement));
        when(repository.findByMonthOrderByVersionDesc("2026-10")).thenReturn(List.of(statement));

        assertThat(service.list(null)).hasSize(1);
        assertThat(service.list(" ")).hasSize(1);
        assertThat(service.list("2026-10")).hasSize(1);
    }

    @Test
    @DisplayName("A missing statement is a not found in French")
    void notFound() {
        when(repository.findWithLinesById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get(9L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Note de frais introuvable.");
        assertThatThrownBy(() -> service.entity(9L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("The active statement of a month is mapped inside the transaction")
    void activeDto() {
        ExpenseStatement statement = new ExpenseStatement();
        statement.setStatus(DocumentStatus.ACTIVE);
        statement.setLines(List.of());
        when(repository.findFirstByMonthAndStatusOrderByVersionDesc("2026-10", DocumentStatus.ACTIVE))
                .thenReturn(Optional.of(statement));
        when(repository.findFirstByMonthAndStatusOrderByVersionDesc("2026-11", DocumentStatus.ACTIVE))
                .thenReturn(Optional.empty());

        assertThat(service.activeDtoForMonth("2026-10")).isPresent();
        assertThat(service.activeDtoForMonth("2026-11")).isEmpty();
    }

    @Test
    @DisplayName("PDF and ZIP downloads delegate to the document collaborator")
    void pdfAndZip() {
        ExpenseStatement statement = new ExpenseStatement();
        statement.setStatus(DocumentStatus.ACTIVE);
        statement.setLines(List.of());
        when(repository.findWithLinesById(9L)).thenReturn(Optional.of(statement));
        when(documents.pdf(statement, true)).thenReturn(new byte[]{3});
        when(documents.zip(statement)).thenReturn(new byte[]{4});

        assertThat(service.pdf(9L, true)).containsExactly(3);
        assertThat(service.zip(9L)).containsExactly(4);
    }

    @Test
    @DisplayName("Mapping a statement exposes receipt fields when a receipt is attached")
    void toDtoWithReceipt() {
        ExpenseStatement statement = new ExpenseStatement();
        statement.setStatus(DocumentStatus.ACTIVE);
        statement.setTotal(new BigDecimal("50"));
        Receipt receipt = new Receipt();
        receipt.setId(5L);
        receipt.setFileName("facture.pdf");
        ExpenseLine line = new ExpenseLine();
        line.setId(1L);
        line.setExpenseItem(item("gaz", "Gaz", 20));
        line.setAmountInclVat(new BigDecimal("100"));
        line.setMonthlyAmount(new BigDecimal("100"));
        line.setProRataPct(new BigDecimal("50"));
        line.setClaimedAmount(new BigDecimal("50"));
        line.setAmountSource(AmountSource.MANUAL);
        line.setReceipt(receipt);

        StatementDto dto = statementDto(statement, line);

        assertThat(dto.lines().get(0).receiptId()).isEqualTo(5L);
        assertThat(dto.lines().get(0).receiptName()).isEqualTo("facture.pdf");
    }

    @Test
    @DisplayName("Mapping a statement without receipt leaves the receipt fields null")
    void toDtoWithoutReceipt() {
        ExpenseStatement statement = new ExpenseStatement();
        ExpenseLine line = new ExpenseLine();
        line.setExpenseItem(item("gaz", "Gaz", 20));
        line.setAmountInclVat(new BigDecimal("100"));
        line.setMonthlyAmount(new BigDecimal("100"));
        line.setProRataPct(new BigDecimal("50"));
        line.setClaimedAmount(new BigDecimal("50"));
        line.setAmountSource(AmountSource.MANUAL);

        StatementDto dto = statementDto(statement, line);

        assertThat(dto.lines().get(0).receiptId()).isNull();
        assertThat(dto.lines().get(0).receiptName()).isNull();
        assertThat(dto.pdfAvailable()).isFalse();
        assertThat(dto.fullPdfAvailable()).isFalse();
    }
}
