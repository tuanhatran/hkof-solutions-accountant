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
import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.DocumentStatus;
import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.ExpenseLine;
import fr.hkof.homeofficeexpenses.domain.ExpenseStatement;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.Receipt;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
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

    private static final Long COMPANY_ID = 1L;

    private ExpenseStatementRepository repository;
    private CompanyService companies;
    private ExpenseItemService expenseItemService;
    private RentReceiptService rentReceiptService;
    private TemplateDataService templateDataService;
    private StorageService storage;
    private ExpenseStatementLineCalculator lineCalculator;
    private ExpenseStatementDocumentService documents;
    private LeaseService leases;
    private DocumentDraftService documentDraftService;
    private ExpenseStatementService service;

    @BeforeEach
    void setUp() {
        repository = mock(ExpenseStatementRepository.class);
        companies = mock(CompanyService.class);
        expenseItemService = mock(ExpenseItemService.class);
        rentReceiptService = mock(RentReceiptService.class);
        templateDataService = mock(TemplateDataService.class);
        storage = mock(StorageService.class);
        lineCalculator = mock(ExpenseStatementLineCalculator.class);
        documents = mock(ExpenseStatementDocumentService.class);
        leases = mock(LeaseService.class);
        documentDraftService = mock(DocumentDraftService.class);
        service = new ExpenseStatementService(repository, companies, expenseItemService, rentReceiptService,
                templateDataService, storage, lineCalculator, documents, leases, documentDraftService);
        when(companies.entity(COMPANY_ID)).thenReturn(company());
        when(companies.find(COMPANY_ID)).thenReturn(Optional.of(company()));
        when(leases.proRata(any(), any())).thenReturn(
                new LeaseService.ProRata(new BigDecimal("35.71"), "Surface pro 25 m² / 70 m² = 35,71 %"));
    }

    private Company company() {
        Company company = new Company();
        company.setId(COMPANY_ID);
        company.setName("HKOF");
        company.setBusinessArea(new BigDecimal("25"));
        company.setTotalArea(new BigDecimal("70"));
        return company;
    }

    private ExpenseItem item(String code, String label, int sortOrder) {
        ExpenseItem item = new ExpenseItem();
        item.setId((long) sortOrder);
        item.setCompanyId(COMPANY_ID);
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

    private ExpenseItemDto itemDto(Long id, String code, String label) {
        return new ExpenseItemDto(id, COMPANY_ID, null, code, label, null, "100.00", "MONTHLY", true, 10, false);
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
        when(lineCalculator.calculateLines(eq(COMPANY_ID), any(), any())).thenReturn(List.of(calculatedLine(gaz)));
        when(lineCalculator.toDto(any())).thenCallRealMethod();
        CalculationResponse response = service.calculate(
                new StatementCalculationRequest(COMPANY_ID, null, "2026-10", List.of()));

        assertThat(response.total()).isEqualTo("50.00");
        assertThat(response.totalInWords()).isEqualTo("cinquante euros");
        assertThat(response.proRataBase()).isEqualTo("35.71");
        assertThat(response.proRataBaseDetail()).contains("Surface pro");
    }

    @Test
    @DisplayName("Calculation resolves the expense items of the selected lease")
    void calculateUsesSelectedLease() {
        Lease lease = new Lease();
        lease.setId(4L);
        lease.setCompanyId(COMPANY_ID);
        when(leases.resolveExpenseLease(COMPANY_ID, 4L)).thenReturn(lease);
        ExpenseItem loyer = item("loyer", "Loyer du bail 4", 10);
        when(lineCalculator.calculateLines(COMPANY_ID, 4L, List.of()))
                .thenReturn(List.of(calculatedLine(loyer)));
        when(lineCalculator.toDto(any())).thenCallRealMethod();

        CalculationResponse response = service.calculate(
                new StatementCalculationRequest(COMPANY_ID, 4L, "2026-10", List.of()));

        assertThat(response.lines().get(0).itemLabel()).isEqualTo("Loyer du bail 4");
        verify(lineCalculator).calculateLines(COMPANY_ID, 4L, List.of());
    }

    @Test
    @DisplayName("A draft without rent receipt only lists missing items")
    void draftWithoutReceipt() {
        when(rentReceiptService.activeForLease(COMPANY_ID, "2026-10", null)).thenReturn(null);
        when(expenseItemService.list(COMPANY_ID, null, false)).thenReturn(List.of(
                itemDto(1L, "loyer", "Loyer"), itemDto(2L, "gaz", "Gaz")));

        DraftDto draft = service.draft(COMPANY_ID, "2026-10", null);

        assertThat(draft.rentReceipt()).isNull();
        assertThat(draft.lines()).isEmpty();
        assertThat(draft.missingItems()).containsExactly("gaz");
        assertThat(draft.proRataBase()).isEqualTo("35.71");
    }

    @Test
    @DisplayName("A draft with a rent receipt prefills the rent line")
    void draftWithReceipt() {
        RentReceipt rentReceipt = new RentReceipt();
        rentReceipt.setTotal(new BigDecimal("950.00"));
        when(rentReceiptService.activeForLease(COMPANY_ID, "2026-10", null)).thenReturn(rentReceipt);
        RentReceiptDto receiptDto = new RentReceiptDto(9L, COMPANY_ID, "HKOF", "2026-10", 1L, 2L, null,
                "Bailleur", "Locataire", null, null, "900.00", "50.00", "950.00", null, null, 1, "ACTIVE",
                1L, "Quittance", 1, null, true, null);
        when(rentReceiptService.toDto(rentReceipt)).thenReturn(receiptDto);
        when(expenseItemService.entity(COMPANY_ID, null, "loyer"))
                .thenReturn(item("loyer", "Quittance de loyer", 10));
        when(expenseItemService.list(COMPANY_ID, null, false)).thenReturn(List.of(itemDto(1L, "loyer", "Loyer")));

        DraftDto draft = service.draft(COMPANY_ID, "2026-10", null);

        assertThat(draft.rentReceipt()).isSameAs(receiptDto);
        assertThat(draft.lines()).hasSize(1);
        assertThat(draft.lines().get(0).itemCode()).isEqualTo("loyer");
        assertThat(draft.lines().get(0).claimedAmount()).isEqualTo("950.00");
        assertThat(draft.missingItems()).isEmpty();
    }

    @Test
    @DisplayName("The draft prefills the rent line from the selected lease item")
    void draftUsesSelectedLeaseItem() {
        Lease lease = new Lease();
        lease.setId(4L);
        lease.setCompanyId(COMPANY_ID);
        when(leases.resolveExpenseLease(COMPANY_ID, 4L)).thenReturn(lease);
        RentReceipt rentReceipt = new RentReceipt();
        rentReceipt.setTotal(new BigDecimal("950.00"));
        when(rentReceiptService.activeForLease(COMPANY_ID, "2026-10", 4L)).thenReturn(rentReceipt);
        when(expenseItemService.entity(COMPANY_ID, 4L, "loyer"))
                .thenReturn(item("loyer", "Quittance bail 4", 10));
        when(expenseItemService.list(COMPANY_ID, 4L, false)).thenReturn(List.of(itemDto(1L, "loyer", "Loyer")));

        DraftDto draft = service.draft(COMPANY_ID, "2026-10", 4L);

        assertThat(draft.lines().get(0).itemLabel()).isEqualTo("Quittance bail 4");
        verify(expenseItemService).entity(COMPANY_ID, 4L, "loyer");
    }

    @Test
    @DisplayName("The legacy draft without lease uses the effective lease item and the null receipt scope")
    void draftWithoutLeaseUsesEffectiveLeaseItem() {
        Lease lease = new Lease();
        lease.setId(4L);
        lease.setCompanyId(COMPANY_ID);
        when(leases.resolveExpenseLease(COMPANY_ID, null)).thenReturn(lease);
        RentReceipt rentReceipt = new RentReceipt();
        rentReceipt.setTotal(new BigDecimal("950.00"));
        when(rentReceiptService.activeForLease(COMPANY_ID, "2026-10", null)).thenReturn(rentReceipt);
        when(expenseItemService.entity(COMPANY_ID, null, "loyer"))
                .thenThrow(new BusinessException("EXPENSE_ITEM_UNKNOWN_CODE",
                        "Type de frais inconnu : loyer"));
        when(expenseItemService.entity(COMPANY_ID, 4L, "loyer"))
                .thenReturn(item("loyer", "Quittance bail 4", 10));
        when(expenseItemService.list(COMPANY_ID, 4L, false)).thenReturn(List.of(itemDto(1L, "loyer", "Loyer")));

        DraftDto draft = service.draft(COMPANY_ID, "2026-10", null);

        assertThat(draft.lines().get(0).itemLabel()).isEqualTo("Quittance bail 4");
        assertThat(draft.missingItems()).isEmpty();
        verify(expenseItemService).entity(COMPANY_ID, 4L, "loyer");
        verify(expenseItemService).list(COMPANY_ID, 4L, false);
        verify(rentReceiptService).activeForLease(COMPANY_ID, "2026-10", null);
    }

    @Test
    @DisplayName("Preview delegates to the document collaborator")
    void preview() {
        Lease lease = new Lease();
        lease.setId(4L);
        lease.setCompanyId(COMPANY_ID);
        when(leases.resolveExpenseLease(COMPANY_ID, 4L)).thenReturn(lease);
        when(lineCalculator.calculateLines(eq(COMPANY_ID), eq(4L), any())).thenReturn(List.of());
        when(documents.preview(any(), any(), any(), any(), any())).thenReturn(new byte[]{1});

        byte[] pdf = service.preview(
                new StatementPreviewRequest(COMPANY_ID, 4L, "2026-10", null, false, List.of(), null));

        assertThat(pdf).containsExactly(1);
        verify(lineCalculator).calculateLines(COMPANY_ID, 4L, List.of());
        verify(documents).preview(eq(YearMonth.of(2026, 10)), any(), any(), any(), eq(4L));
    }

    @Test
    @DisplayName("Generation requires at least one line")
    void generateRequiresLines() {
        when(lineCalculator.calculateLines(eq(COMPANY_ID), any(), any())).thenReturn(List.of());
        assertThatThrownBy(() -> service.generate(
                new StatementGenerationRequest(COMPANY_ID, null, "2026-10", null, List.of(), null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ajoutez au moins un frais avant de générer la note.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("STATEMENT_LINES_REQUIRED"));
    }

    @Test
    @DisplayName("Generation archives active statements and stores both PDFs")
    void generate() {
        ExpenseItem gaz = item("gaz", "Gaz", 20);
        when(lineCalculator.calculateLines(eq(COMPANY_ID), any(), any())).thenReturn(List.of(calculatedLine(gaz)));
        when(documents.signatureDataUri(null, COMPANY_ID)).thenReturn("signature");
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
        when(repository.findFirstByCompanyIdAndMonthAndLeaseIdIsNullOrderByVersionDesc(COMPANY_ID, "2026-10"))
                .thenReturn(Optional.of(existing));
        when(repository.findByCompanyIdAndMonthOrderByVersionDesc(COMPANY_ID, "2026-10"))
                .thenReturn(List.of(existing, archivedAlready));

        ExpenseStatement generated = new ExpenseStatement();
        generated.setCompanyId(COMPANY_ID);
        generated.setMonth("2026-10");
        generated.setStatus(DocumentStatus.ACTIVE);
        generated.setLines(List.of());
        when(documents.generate(any(), any(), eq(6), eq(template), eq("signature"), any(), any()))
                .thenReturn(new ExpenseStatementDocumentService.GeneratedStatement(generated, new byte[]{1},
                        new byte[]{2}));
        when(storage.storePdf(anyString(), any())).thenReturn("/data/note.pdf");
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> {
            ExpenseStatement saved = invocation.getArgument(0);
            saved.setId(20L);
            return saved;
        });

        StatementDto dto = service.generate(new StatementGenerationRequest(COMPANY_ID, null, "2026-10", null,
                List.of(new ExpenseLineRequest("gaz", "100", "50", null, null, null, null)), null));

        assertThat(dto.id()).isEqualTo(20L);
        assertThat(dto.companyId()).isEqualTo(COMPANY_ID);
        assertThat(existing.getStatus()).isEqualTo(DocumentStatus.ARCHIVED);
        verify(repository).saveAll(List.of(existing, archivedAlready));
        verify(repository).flush();
        verify(storage).storePdf("note_frais_2026-10_l0_v6.pdf", new byte[]{1});
        verify(storage).storePdf("note_frais_2026-10_l0_v6_complet.pdf", new byte[]{2});
        verify(documentDraftService).deleteActiveStatement(COMPANY_ID, "2026-10", null);
    }

    @Test
    @DisplayName("Generation without an active previous statement skips the archive flush")
    void generateWithoutArchive() {
        ExpenseItem gaz = item("gaz", "Gaz", 20);
        when(lineCalculator.calculateLines(eq(COMPANY_ID), any(), any())).thenReturn(List.of(calculatedLine(gaz)));
        when(documents.signatureDataUri(null, COMPANY_ID)).thenReturn("signature");
        when(documents.templateForStatement(null)).thenReturn(new TemplateDocument());
        when(repository.findFirstByCompanyIdAndMonthAndLeaseIdIsNullOrderByVersionDesc(COMPANY_ID, "2026-10"))
                .thenReturn(Optional.empty());
        when(repository.findByCompanyIdAndMonthOrderByVersionDesc(COMPANY_ID, "2026-10")).thenReturn(List.of());
        ExpenseStatement generated = new ExpenseStatement();
        generated.setCompanyId(COMPANY_ID);
        generated.setMonth("2026-10");
        generated.setStatus(DocumentStatus.ACTIVE);
        generated.setLines(List.of());
        when(documents.generate(any(), any(), eq(1), any(), any(), any(), any()))
                .thenReturn(new ExpenseStatementDocumentService.GeneratedStatement(generated, new byte[]{1},
                        new byte[]{2}));
        when(storage.storePdf(anyString(), any())).thenReturn("/data/note.pdf");
        when(repository.saveAndFlush(any())).thenReturn(generated);

        service.generate(new StatementGenerationRequest(COMPANY_ID, null, "2026-10", null,
                List.of(new ExpenseLineRequest("gaz", "100", "50", null, null, null, null)), null));

        verify(repository, never()).flush();
        verify(repository, never()).saveAll(any());
    }

    @Test
    @DisplayName("Generation versions, archives and names files per lease")
    void generateScopesToLease() {
        Lease lease = new Lease();
        lease.setId(7L);
        lease.setCompanyId(COMPANY_ID);
        when(leases.resolveExpenseLease(COMPANY_ID, 7L)).thenReturn(lease);
        ExpenseItem gaz = item("gaz", "Gaz", 20);
        when(lineCalculator.calculateLines(eq(COMPANY_ID), any(), any())).thenReturn(List.of(calculatedLine(gaz)));
        when(documents.signatureDataUri(null, COMPANY_ID)).thenReturn("signature");
        when(documents.templateForStatement(null)).thenReturn(new TemplateDocument());
        ExpenseStatement sameLease = new ExpenseStatement();
        sameLease.setLeaseId(7L);
        sameLease.setStatus(DocumentStatus.ACTIVE);
        sameLease.setVersion(2);
        ExpenseStatement otherLease = new ExpenseStatement();
        otherLease.setLeaseId(8L);
        otherLease.setStatus(DocumentStatus.ACTIVE);
        otherLease.setVersion(1);
        when(repository.findFirstByCompanyIdAndMonthAndLeaseIdOrderByVersionDesc(COMPANY_ID, "2026-10", 7L))
                .thenReturn(Optional.of(sameLease));
        when(repository.findByCompanyIdAndMonthOrderByVersionDesc(COMPANY_ID, "2026-10"))
                .thenReturn(List.of(sameLease, otherLease));
        ExpenseStatement generated = new ExpenseStatement();
        generated.setCompanyId(COMPANY_ID);
        generated.setLeaseId(7L);
        generated.setMonth("2026-10");
        generated.setStatus(DocumentStatus.ACTIVE);
        generated.setLines(List.of());
        when(documents.generate(any(), any(), eq(3), any(), any(), any(), eq(7L)))
                .thenReturn(new ExpenseStatementDocumentService.GeneratedStatement(generated, new byte[]{1},
                        new byte[]{2}));
        when(storage.storePdf(anyString(), any())).thenReturn("/data/note.pdf");
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.generate(new StatementGenerationRequest(COMPANY_ID, 7L, "2026-10", null,
                List.of(new ExpenseLineRequest("gaz", "100", "50", null, null, null, null)), null));

        assertThat(sameLease.getStatus()).isEqualTo(DocumentStatus.ARCHIVED);
        assertThat(otherLease.getStatus()).isEqualTo(DocumentStatus.ACTIVE);
        verify(lineCalculator).calculateLines(eq(COMPANY_ID), eq(7L), any());
        verify(storage).storePdf("note_frais_2026-10_l7_v3.pdf", new byte[]{1});
        verify(storage).storePdf("note_frais_2026-10_l7_v3_complet.pdf", new byte[]{2});
        verify(documentDraftService).deleteActiveStatement(COMPANY_ID, "2026-10", 7L);
    }

    @Test
    @DisplayName("Listing filters by company and month")
    void list() {
        ExpenseStatement statement = new ExpenseStatement();
        statement.setCompanyId(COMPANY_ID);
        statement.setStatus(DocumentStatus.ACTIVE);
        statement.setLines(List.of());
        when(repository.findByCompanyIdOrderByMonthDescVersionDesc(COMPANY_ID)).thenReturn(List.of(statement));
        when(repository.findByCompanyIdAndMonthOrderByVersionDesc(COMPANY_ID, "2026-10"))
                .thenReturn(List.of(statement));

        assertThat(service.list(COMPANY_ID, null, null)).hasSize(1);
        assertThat(service.list(COMPANY_ID, " ", null)).hasSize(1);
        assertThat(service.list(COMPANY_ID, "2026-10", null)).hasSize(1);
    }

    @Test
    @DisplayName("A missing statement is a not found in French")
    void notFound() {
        when(repository.findWithLinesById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get(9L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Note de frais introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("STATEMENT_NOT_FOUND"));
        assertThatThrownBy(() -> service.entity(9L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("The active statement of a company and month is mapped inside the transaction")
    void activeDto() {
        ExpenseStatement statement = new ExpenseStatement();
        statement.setCompanyId(COMPANY_ID);
        statement.setStatus(DocumentStatus.ACTIVE);
        statement.setLines(List.of());
        when(repository.findFirstByCompanyIdAndMonthAndStatusOrderByVersionDesc(COMPANY_ID, "2026-10",
                DocumentStatus.ACTIVE)).thenReturn(Optional.of(statement));
        when(repository.findFirstByCompanyIdAndMonthAndStatusOrderByVersionDesc(COMPANY_ID, "2026-11",
                DocumentStatus.ACTIVE)).thenReturn(Optional.empty());

        assertThat(service.activeDtoForMonth(COMPANY_ID, "2026-10", null)).isPresent();
        assertThat(service.activeDtoForMonth(COMPANY_ID, "2026-11", null)).isEmpty();
    }

    @Test
    @DisplayName("The active statement of a lease ignores another lease active for the same month")
    void activeDtoOfLease() {
        Lease lease = new Lease();
        lease.setId(7L);
        lease.setCompanyId(COMPANY_ID);
        when(leases.resolveExpenseLease(COMPANY_ID, 7L)).thenReturn(lease);
        ExpenseStatement statement = new ExpenseStatement();
        statement.setCompanyId(COMPANY_ID);
        statement.setLeaseId(7L);
        statement.setStatus(DocumentStatus.ACTIVE);
        statement.setLines(List.of());
        when(repository.findFirstByCompanyIdAndMonthAndLeaseIdAndStatusOrderByVersionDesc(COMPANY_ID, "2026-10",
                7L, DocumentStatus.ACTIVE)).thenReturn(Optional.of(statement));

        Optional<StatementDto> active = service.activeDtoForMonth(COMPANY_ID, "2026-10", 7L);

        assertThat(active).isPresent();
        assertThat(active.get().leaseId()).isEqualTo(7L);
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
        statement.setCompanyId(COMPANY_ID);
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

        assertThat(dto.companyName()).isEqualTo("HKOF");
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
