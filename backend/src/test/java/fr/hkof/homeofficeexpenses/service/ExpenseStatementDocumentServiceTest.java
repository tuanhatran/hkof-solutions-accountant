package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

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
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.SignatureType;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.service.extraction.DocumentTextExtractor;
import fr.hkof.homeofficeexpenses.service.template.TemplateDataService;
import fr.hkof.homeofficeexpenses.service.template.TemplateService;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.StatementPreviewRequest;

class ExpenseStatementDocumentServiceTest {

    private RentReceiptService rentReceiptService;
    private TemplateService templateService;
    private TemplateDataService templateDataService;
    private SignatureService signatureService;
    private PdfService pdfService;
    private StorageService storage;
    private DocumentTextExtractor textExtractor;
    private ExpenseStatementDocumentService service;

    @BeforeEach
    void setUp() {
        rentReceiptService = mock(RentReceiptService.class);
        templateService = mock(TemplateService.class);
        templateDataService = mock(TemplateDataService.class);
        signatureService = mock(SignatureService.class);
        pdfService = mock(PdfService.class);
        storage = mock(StorageService.class);
        textExtractor = mock(DocumentTextExtractor.class);
        service = new ExpenseStatementDocumentService(rentReceiptService, templateService, templateDataService,
                signatureService, pdfService, storage, textExtractor,
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
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

    private CalculatedLine line(ExpenseItem item, Receipt receipt) {
        return new CalculatedLine(item, new BigDecimal("100.00"), new BigDecimal("100.00"),
                new BigDecimal("50.00"), new BigDecimal("50.00"), receipt, AmountSource.MANUAL,
                new BigDecimal("90.00"), "haute");
    }

    private TemplateDocument template(Long id, TemplateType type) {
        TemplateDocument template = new TemplateDocument();
        template.setId(id);
        template.setType(type);
        template.setName("Modèle");
        template.setVersion(2);
        return template;
    }

    private Receipt receipt(Long id, String mimeType, String path, String fileName) {
        Receipt receipt = new Receipt();
        receipt.setId(id);
        receipt.setMimeType(mimeType);
        receipt.setPath(path);
        receipt.setFileName(fileName);
        return receipt;
    }

    private StatementPreviewRequest previewRequest(Long templateId, boolean complete) {
        return new StatementPreviewRequest("2026-10", templateId, complete, List.of(), null);
    }

    private void stubDocumentRendering(TemplateDocument template, String html) {
        when(templateDataService.dataStatement(any(), any(), anyBoolean(), any())).thenReturn(java.util.Map.of());
        when(templateService.render(eq(template), any())).thenReturn(html);
        when(pdfService.renderHtmlToPdf(html)).thenReturn(new byte[]{1});
        when(pdfService.addWatermark(any())).thenReturn(new byte[]{9});
        when(signatureService.resolve(any(), eq(SignatureType.ENTREPRISE_CEO))).thenReturn(OptionalSignature.present());
        when(signatureService.dataUri(7L)).thenReturn("data:image/png;base64,AAAA");
    }

    @Test
    @DisplayName("Preview renders the active template and watermarks it")
    void preview() {
        TemplateDocument template = template(4L, TemplateType.EXPENSE_STATEMENT);
        when(templateService.active(TemplateType.EXPENSE_STATEMENT)).thenReturn(template);
        stubDocumentRendering(template, "<html></html>");

        byte[] pdf = service.preview(YearMonth.of(2026, 10), List.of(line(item("gaz", "Gaz", 20), null)),
                new Settings(), previewRequest(null, false));

        assertThat(pdf).containsExactly(9);
        verify(pdfService, never()).merge(any());
    }

    @Test
    @DisplayName("A complete preview merges the statement, rent receipt and every attachment once")
    void completePreview() {
        TemplateDocument template = template(4L, TemplateType.EXPENSE_STATEMENT);
        when(templateService.active(TemplateType.EXPENSE_STATEMENT)).thenReturn(template);
        stubDocumentRendering(template, "<html></html>");
        when(pdfService.merge(any())).thenReturn(new byte[]{2});

        RentReceipt rentReceipt = new RentReceipt();
        rentReceipt.setPdfPath("/data/quittance.pdf");
        when(rentReceiptService.activeForMonth("2026-10", null, null)).thenReturn(rentReceipt);
        when(storage.read("/data/quittance.pdf")).thenReturn(new byte[]{3});

        Receipt pdfReceipt = receipt(1L, "application/pdf", "/data/gaz.pdf", "gaz.pdf");
        Receipt imageReceipt = receipt(2L, "image/png", "/data/scan.png", "scan.png");
        Receipt textReceipt = receipt(3L, "text/plain", "/data/note.txt", "note.txt");
        when(storage.read("/data/gaz.pdf")).thenReturn(new byte[]{4});
        when(storage.read("/data/scan.png")).thenReturn(new byte[]{5});
        when(storage.read("/data/note.txt")).thenReturn(new byte[]{6});
        when(pdfService.imageToPdf(new byte[]{5}, "scan.png")).thenReturn(new byte[]{7});
        when(storage.temporaryPath("note.txt", new byte[]{6})).thenReturn("/tmp/note.txt");
        when(textExtractor.extract(any(), eq("text/plain"), eq(1)))
                .thenReturn(new DocumentTextExtractor.Extraction("texte", List.of(), false, 0));
        when(pdfService.pageText("Justificatif — note.txt", "texte")).thenReturn(new byte[]{8});

        List<CalculatedLine> lines = List.of(
                line(item("gaz", "Gaz", 20), pdfReceipt),
                line(item("electricite", "Électricité", 30), imageReceipt),
                line(item("fibre", "Fibre", 40), textReceipt),
                line(item("gaz", "Gaz", 20), pdfReceipt));

        byte[] pdf = service.preview(YearMonth.of(2026, 10), lines, new Settings(), previewRequest(null, true));

        assertThat(pdf).containsExactly(9);
        @SuppressWarnings("unchecked")
        org.mockito.ArgumentCaptor<List<byte[]>> merged = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(pdfService).merge(merged.capture());
        assertThat(merged.getValue()).hasSize(5);
    }

    @Test
    @DisplayName("A complete preview tolerates a missing rent receipt and receiptless lines")
    void completePreviewWithoutAttachments() {
        TemplateDocument template = template(4L, TemplateType.EXPENSE_STATEMENT);
        when(templateService.active(TemplateType.EXPENSE_STATEMENT)).thenReturn(template);
        stubDocumentRendering(template, "<html></html>");
        when(pdfService.merge(any())).thenReturn(new byte[]{2});
        when(rentReceiptService.activeForMonth("2026-10", null, null)).thenReturn(null);

        List<CalculatedLine> lines = List.of(
                line(item("gaz", "Gaz", 20), null),
                line(item("electricite", "Électricité", 30), null));

        service.preview(YearMonth.of(2026, 10), lines, new Settings(), previewRequest(null, true));

        @SuppressWarnings("unchecked")
        org.mockito.ArgumentCaptor<List<byte[]>> merged = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(pdfService).merge(merged.capture());
        assertThat(merged.getValue()).hasSize(1);
    }

    @Test
    @DisplayName("Preview selects an explicit template and rejects a template of another type")
    void previewTemplateSelection() {
        TemplateDocument template = template(4L, TemplateType.EXPENSE_STATEMENT);
        when(templateService.byId(4L)).thenReturn(template);
        stubDocumentRendering(template, "<html></html>");
        service.preview(YearMonth.of(2026, 10), List.of(), new Settings(), previewRequest(4L, false));

        when(templateService.byId(9L)).thenReturn(template(9L, TemplateType.RENT_RECEIPT));
        assertThatThrownBy(() -> service.preview(YearMonth.of(2026, 10), List.of(), new Settings(),
                previewRequest(9L, false)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le template sélectionné n'est pas un template de note de frais.");
    }

    @Test
    @DisplayName("Preview without a configured signature is rejected in French")
    void previewWithoutSignature() {
        TemplateDocument template = template(4L, TemplateType.EXPENSE_STATEMENT);
        when(templateService.active(TemplateType.EXPENSE_STATEMENT)).thenReturn(template);
        when(signatureService.resolve(null, SignatureType.ENTREPRISE_CEO)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> service.preview(YearMonth.of(2026, 10), List.of(), new Settings(),
                previewRequest(null, false)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Aucune signature configurée. Configurez une signature dans la page Paramètres.");
    }

    @Test
    @DisplayName("Generation builds the statement, its PDF and its complete PDF")
    void generate() {
        TemplateDocument template = template(4L, TemplateType.EXPENSE_STATEMENT);
        stubDocumentRendering(template, "<html></html>");
        when(pdfService.merge(any())).thenReturn(new byte[]{2});
        when(rentReceiptService.activeForMonth("2026-10", null, null)).thenReturn(null);

        ExpenseStatementDocumentService.GeneratedStatement generated = service.generate(YearMonth.of(2026, 10),
                List.of(line(item("gaz", "Gaz", 20), null)), 3, template, "signature", new Settings());

        assertThat(generated.statement().getVersion()).isEqualTo(3);
        assertThat(generated.statement().getMonth()).isEqualTo("2026-10");
        assertThat(generated.statement().getNumber()).isEqualTo("NF-2026-10");
        assertThat(generated.statement().getStatus()).isEqualTo(DocumentStatus.ACTIVE);
        assertThat(generated.statement().getTemplateId()).isEqualTo(4L);
        assertThat(generated.statement().getTemplateName()).isEqualTo("Modèle");
        assertThat(generated.statement().getTotal()).isEqualByComparingTo("50.00");
        assertThat(generated.statement().getLines()).hasSize(1);
        assertThat(generated.pdf()).containsExactly(1);
        assertThat(generated.completePdf()).containsExactly(2);
    }

    @Test
    @DisplayName("Reading a missing PDF is a not found")
    void pdfMissing() {
        ExpenseStatement statement = new ExpenseStatement();
        assertThatThrownBy(() -> service.pdf(statement, false))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Le PDF demandé est introuvable.");
        assertThatThrownBy(() -> service.pdf(statement, true))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("Reading a PDF uses the requested variant")
    void pdf() {
        ExpenseStatement statement = new ExpenseStatement();
        statement.setPdfPath("/data/note.pdf");
        statement.setFullPdfPath("/data/note-complet.pdf");
        when(storage.read("/data/note.pdf")).thenReturn(new byte[]{1});
        when(storage.read("/data/note-complet.pdf")).thenReturn(new byte[]{2});

        assertThat(service.pdf(statement, false)).containsExactly(1);
        assertThat(service.pdf(statement, true)).containsExactly(2);
    }

    @Test
    @DisplayName("The ZIP archive fails when the statement PDF is missing")
    void zipMissingPdf() {
        assertThatThrownBy(() -> service.zip(new ExpenseStatement()))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Le PDF demandé est introuvable.");
    }

    @Test
    @DisplayName("The ZIP archive contains the note, the rent receipt and each attachment once")
    void zip() throws Exception {
        ExpenseStatement statement = new ExpenseStatement();
        statement.setMonth("2026-10");
        statement.setPdfPath("/data/note.pdf");
        when(storage.read("/data/note.pdf")).thenReturn("%PDF-note".getBytes(java.nio.charset.StandardCharsets.UTF_8));

        RentReceipt rentReceipt = new RentReceipt();
        rentReceipt.setPdfPath("/data/quittance.pdf");
        when(rentReceiptService.activeForMonth("2026-10", null, null)).thenReturn(rentReceipt);
        when(storage.read("/data/quittance.pdf"))
                .thenReturn("%PDF-quittance".getBytes(java.nio.charset.StandardCharsets.UTF_8));

        Receipt receipt = receipt(1L, "text/plain", "/data/note.txt", "../note.txt");
        when(storage.read("/data/note.txt")).thenReturn("original".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        ExpenseLine first = new ExpenseLine();
        first.setReceipt(receipt);
        ExpenseLine duplicate = new ExpenseLine();
        duplicate.setReceipt(receipt);
        ExpenseLine empty = new ExpenseLine();
        empty.setReceipt(null);
        statement.setLines(List.of(first, duplicate, empty));

        List<String> names = new ArrayList<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(service.zip(statement)))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                names.add(entry.getName());
            }
        }

        assertThat(names).containsExactly("note_frais_2026-10.pdf", "quittance_2026-10.pdf",
                "justificatifs/01_note.txt");
    }

    @Test
    @DisplayName("The ZIP archive skips a rent receipt without a PDF path or file name")
    void zipSkipsIncompleteEntries() throws Exception {
        ExpenseStatement statement = new ExpenseStatement();
        statement.setMonth("2026-10");
        statement.setPdfPath("/data/note.pdf");
        when(storage.read("/data/note.pdf")).thenReturn(new byte[]{1});

        RentReceipt rentReceipt = new RentReceipt();
        rentReceipt.setPdfPath(" ");
        when(rentReceiptService.activeForMonth("2026-10", null, null)).thenReturn(rentReceipt);

        Receipt blankName = receipt(2L, "application/pdf", "/data/x.pdf", " ");
        ExpenseLine line = new ExpenseLine();
        line.setReceipt(blankName);
        statement.setLines(List.of(line));

        List<String> names = new ArrayList<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(service.zip(statement)))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                names.add(entry.getName());
            }
        }

        assertThat(names).containsExactly("note_frais_2026-10.pdf");
    }

    @Test
    @DisplayName("The signature resolver defaults to the company signature and rejects a missing one")
    void signatureDataUri() {
        when(signatureService.resolve(null, SignatureType.ENTREPRISE_CEO)).thenReturn(OptionalSignature.present());
        when(signatureService.dataUri(7L)).thenReturn("data:image/png;base64,AAAA");
        assertThat(service.signatureDataUri(null, SignatureType.ENTREPRISE_CEO))
                .isEqualTo("data:image/png;base64,AAAA");

        when(signatureService.resolve(null, SignatureType.ENTREPRISE_CEO)).thenReturn(java.util.Optional.empty());
        assertThatThrownBy(() -> service.signatureDataUri(null, SignatureType.ENTREPRISE_CEO))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Aucune signature configurée");
    }

    private static final class OptionalSignature {
        private static java.util.Optional<Signature> present() {
            Signature signature = new Signature();
            signature.setId(7L);
            signature.setType(SignatureType.ENTREPRISE_CEO);
            return java.util.Optional.of(signature);
        }
    }
}
