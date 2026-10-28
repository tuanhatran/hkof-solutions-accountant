package fr.hkof.homeofficeexpenses.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.springframework.stereotype.Service;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.DocumentStatus;
import fr.hkof.homeofficeexpenses.domain.ExpenseLine;
import fr.hkof.homeofficeexpenses.domain.ExpenseStatement;
import fr.hkof.homeofficeexpenses.domain.Receipt;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.service.extraction.DocumentTextExtractor;
import fr.hkof.homeofficeexpenses.service.template.TemplateDataService;
import fr.hkof.homeofficeexpenses.service.template.TemplateService;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.StatementPreviewRequest;

/**
 * Assembles expense statement documents: preview, generated PDF, complete PDF with
 * attachments and the download archive. Persistence stays in {@link ExpenseStatementService}.
 */
@Service
public class ExpenseStatementDocumentService {

    private final RentReceiptService rentReceiptService;
    private final TemplateService templateService;
    private final TemplateDataService templateDataService;
    private final SignatureService signatureService;
    private final PdfService pdfService;
    private final StorageService storage;
    private final DocumentTextExtractor textExtractor;
    private final Clock clock;

    public ExpenseStatementDocumentService(RentReceiptService rentReceiptService, TemplateService templateService,
            TemplateDataService templateDataService, SignatureService signatureService, PdfService pdfService,
            StorageService storage, DocumentTextExtractor textExtractor, Clock clock) {
        this.rentReceiptService = rentReceiptService;
        this.templateService = templateService;
        this.templateDataService = templateDataService;
        this.signatureService = signatureService;
        this.pdfService = pdfService;
        this.storage = storage;
        this.textExtractor = textExtractor;
        this.clock = clock;
    }

    public byte[] preview(YearMonth month, List<CalculatedLine> lines, Company company,
            StatementPreviewRequest request, Long leaseId) {
        ExpenseStatement statement = buildStatement(month, lines, null, null, company, leaseId);
        boolean complete = Boolean.TRUE.equals(request.complete());
        String signature = signatureDataUri(request.signatureId(), company.getId());
        TemplateDocument template = templateForStatement(request.templateId());
        String html = templateService.render(template,
                templateDataService.dataStatement(company, statement, complete, signature));
        byte[] pdf = pdfService.renderHtmlToPdf(html);
        if (complete) {
            pdf = pdfService.merge(withAttachments(pdf, statement, month));
        }
        return pdfService.addWatermark(pdf);
    }

    public GeneratedStatement generate(YearMonth month, List<CalculatedLine> lines, int version,
            TemplateDocument template, String signature, Company company, Long leaseId) {
        ExpenseStatement statement = buildStatement(month, lines, version, template, company, leaseId);
        String html = templateService.render(template,
                templateDataService.dataStatement(company, statement, true, signature));
        byte[] pdf = pdfService.renderHtmlToPdf(html);
        byte[] completePdf = pdfService.merge(withAttachments(pdf, statement, month));
        return new GeneratedStatement(statement, pdf, completePdf);
    }

    public byte[] pdf(ExpenseStatement statement, boolean complete) {
        String path = complete ? statement.getFullPdfPath() : statement.getPdfPath();
        if (path == null) {
            throw new NotFoundException("STATEMENT_PDF_NOT_FOUND", "Le PDF demandé est introuvable.");
        }
        return storage.read(path);
    }

    /**
     * Builds the complete download archive: the generated note PDF, the active rent receipt of
     * the month and every justificatif of the statement in its original format. Justificatifs are
     * deduplicated by receipt id and kept in statement line order.
     */
    public byte[] zip(ExpenseStatement statement) {
        if (statement.getPdfPath() == null) {
            throw new NotFoundException("STATEMENT_PDF_NOT_FOUND", "Le PDF demandé est introuvable.");
        }
        String month = statement.getMonth();
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
                ZipOutputStream zip = new ZipOutputStream(out, StandardCharsets.UTF_8)) {
            addEntry(zip, "note_frais_" + month + ".pdf", storage.read(statement.getPdfPath()));
            RentReceipt rentReceipt = rentReceiptService.activeForLease(statement.getCompanyId(), month,
                    statement.getLeaseId());
            if (rentReceipt != null && rentReceipt.getPdfPath() != null
                    && !rentReceipt.getPdfPath().isBlank()) {
                addEntry(zip, "quittance_" + month + ".pdf", storage.read(rentReceipt.getPdfPath()));
            }
            Set<Long> processedReceiptIds = new HashSet<>();
            int index = 0;
            for (ExpenseLine line : statement.getLines()) {
                Receipt receipt = line.getReceipt();
                if (receipt == null || !processedReceiptIds.add(receipt.getId())) {
                    continue;
                }
                if (receipt.getPath() == null || receipt.getPath().isBlank()
                        || receipt.getFileName() == null || receipt.getFileName().isBlank()) {
                    continue;
                }
                index++;
                addEntry(zip, "justificatifs/" + String.format(Locale.ROOT, "%02d", index) + "_"
                        + StorageService.sanitizeName(receipt.getFileName()), storage.read(receipt.getPath()));
            }
            zip.finish();
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de générer l'archive ZIP.", ex);
        }
    }

    public String signatureDataUri(Long requestedId, Long companyId) {
        Signature signature = signatureService.resolveForCompanyCeo(companyId, requestedId)
                .orElseThrow(() -> new BusinessException("STATEMENT_SIGNATURE_MISSING",
                        "Aucune signature configurée pour le gérant. Ajoutez une signature au salarié gérant dans la page LMNP."));
        return signatureService.dataUri(signature.getId());
    }

    public TemplateDocument templateForStatement(Long templateId) {
        TemplateDocument template = templateId == null
                ? templateService.active(TemplateType.EXPENSE_STATEMENT)
                : templateService.byId(templateId);
        if (template.getType() != TemplateType.EXPENSE_STATEMENT) {
            throw new BusinessException("STATEMENT_TEMPLATE_INVALID",
                    "Le template sélectionné n'est pas un template de note de frais.");
        }
        return template;
    }

    private ExpenseStatement buildStatement(YearMonth month, List<CalculatedLine> lines, Integer version,
            TemplateDocument template, Company company, Long leaseId) {
        ExpenseStatement statement = new ExpenseStatement();
        statement.setCompanyId(company.getId());
        statement.setLeaseId(leaseId);
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
        statement.setTotal(total.setScale(2, RoundingMode.HALF_UP));
        return statement;
    }

    private List<byte[]> withAttachments(byte[] statementPdf, ExpenseStatement statement, YearMonth month) {
        List<byte[]> pdfs = new ArrayList<>();
        pdfs.add(statementPdf);
        // The rent annex follows the statement lease, so two leases of a month keep distinct annexes.
        RentReceipt rentReceipt = rentReceiptService.activeForLease(statement.getCompanyId(), month.toString(),
                statement.getLeaseId());
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

    private static void addEntry(ZipOutputStream zip, String name, byte[] content) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content);
        zip.closeEntry();
    }

    public record GeneratedStatement(ExpenseStatement statement, byte[] pdf, byte[] completePdf) {
    }
}
