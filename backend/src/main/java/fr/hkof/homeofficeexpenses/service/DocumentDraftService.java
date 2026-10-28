package fr.hkof.homeofficeexpenses.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.ObjectMapper;

import fr.hkof.homeofficeexpenses.domain.DocumentDraft;
import fr.hkof.homeofficeexpenses.repository.DocumentDraftRepository;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.RentReceiptDraftDto;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.RentReceiptDraftRequest;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.StatementDraftDto;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.StatementDraftRequest;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.ExpenseLineRequest;

/**
 * Persists the editable form state of the two generation pages. A draft is never a
 * document: only validated form values are stored, no total is computed here. One scope
 * holds at most one active draft; each save inserts a new row and logically deletes the
 * previous active row of the same scope.
 */
@Service
public class DocumentDraftService {

    private static final Set<String> AMOUNT_SOURCES = Set.of("MANUAL", "AI");
    private static final Set<String> CONFIDENCES = Set.of("haute", "moyenne", "basse");

    private final DocumentDraftRepository repository;
    private final ObjectMapper mapper;
    private final Clock clock;

    public DocumentDraftService(DocumentDraftRepository repository, ObjectMapper mapper, Clock clock) {
        this.repository = repository;
        this.mapper = mapper;
        this.clock = clock;
    }

    @Transactional
    public RentReceiptDraftDto saveRentReceipt(RentReceiptDraftRequest request) {
        RentReceiptDraftRequest normalized = normalizeRentReceipt(request);
        findActiveRentReceipt(normalized.month(), normalized.landlordId(), normalized.tenantId(),
                normalized.tenantCompanyId()).ifPresent(this::softDelete);
        DocumentDraft entity = newEntity(DocumentDraft.Type.RENT_RECEIPT, normalized.month(), normalized);
        entity.setLandlordId(normalized.landlordId());
        entity.setTenantId(normalized.tenantId());
        entity.setTenantCompanyId(normalized.tenantCompanyId());
        return toRentReceiptDto(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public Optional<RentReceiptDraftDto> findRentReceipt(String month, Long landlordId, Long tenantId,
            Long tenantCompanyId) {
        if (landlordId == null) {
            throw new BusinessException("DRAFT_LANDLORD_REQUIRED", "Le bailleur du brouillon est obligatoire.");
        }
        requireSingleTenant(tenantId, tenantCompanyId);
        return findActiveRentReceipt(Amounts.month(month).toString(), landlordId, tenantId, tenantCompanyId)
                .map(this::toRentReceiptDto);
    }

    @Transactional
    public StatementDraftDto saveStatement(StatementDraftRequest request) {
        StatementDraftRequest normalized = normalizeStatement(request);
        findActiveStatement(normalized.month(), normalized.companyId()).ifPresent(this::softDelete);
        DocumentDraft entity = newEntity(DocumentDraft.Type.EXPENSE_STATEMENT, normalized.month(), normalized);
        entity.setCompanyId(normalized.companyId());
        return toStatementDto(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public Optional<StatementDraftDto> findStatement(Long companyId, String month) {
        if (companyId == null) {
            throw new BusinessException("DRAFT_COMPANY_REQUIRED", "La société du brouillon est obligatoire.");
        }
        return findActiveStatement(Amounts.month(month).toString(), companyId).map(this::toStatementDto);
    }

    @Transactional
    public void delete(Long id) {
        DocumentDraft draft = repository.findById(id)
                .filter(candidate -> !candidate.isDeleted())
                .orElseThrow(() -> new NotFoundException("DRAFT_NOT_FOUND", "Brouillon introuvable."));
        softDelete(draft);
    }

    /**
     * Logically deletes the active rent receipt draft of a generation scope. Called
     * inside the generation transaction so a generated document never leaves a draft.
     */
    @Transactional
    public void deleteActiveRentReceipt(String month, Long landlordId, Long tenantId, Long tenantCompanyId) {
        if (landlordId == null) {
            return;
        }
        requireSingleTenant(tenantId, tenantCompanyId);
        findActiveRentReceipt(Amounts.month(month).toString(), landlordId, tenantId, tenantCompanyId)
                .ifPresent(this::softDelete);
    }

    /**
     * Logically deletes the active expense statement draft of a generation scope.
     * Called inside the generation transaction so a generated document never leaves a draft.
     */
    @Transactional
    public void deleteActiveStatement(Long companyId, String month) {
        if (companyId == null) {
            return;
        }
        findActiveStatement(Amounts.month(month).toString(), companyId).ifPresent(this::softDelete);
    }

    /** Serialises a validated request, exposed for the tests that seed a stored payload. */
    public String write(Object request) {
        try {
            return mapper.writeValueAsString(request);
        } catch (RuntimeException ex) {
            throw new IllegalStateException("Brouillon non sérialisable.", ex);
        }
    }

    private Optional<DocumentDraft> findActiveRentReceipt(String month, Long landlordId, Long tenantId,
            Long tenantCompanyId) {
        return tenantId != null
                ? repository.findFirstByTypeAndMonthAndLandlordIdAndTenantIdAndDeletedFalseOrderByIdDesc(
                        DocumentDraft.Type.RENT_RECEIPT, month, landlordId, tenantId)
                : repository.findFirstByTypeAndMonthAndLandlordIdAndTenantCompanyIdAndDeletedFalseOrderByIdDesc(
                        DocumentDraft.Type.RENT_RECEIPT, month, landlordId, tenantCompanyId);
    }

    private Optional<DocumentDraft> findActiveStatement(String month, Long companyId) {
        return repository.findFirstByTypeAndMonthAndCompanyIdAndDeletedFalseOrderByIdDesc(
                DocumentDraft.Type.EXPENSE_STATEMENT, month, companyId);
    }

    private void softDelete(DocumentDraft draft) {
        draft.setDeleted(true);
        repository.save(draft);
    }

    private DocumentDraft newEntity(DocumentDraft.Type type, String month, Object payload) {
        DocumentDraft entity = new DocumentDraft();
        entity.setType(type);
        entity.setMonth(month);
        entity.setPayload(write(payload));
        entity.setSavedAt(Instant.now(clock));
        entity.setDeleted(false);
        return entity;
    }

    private RentReceiptDraftRequest normalizeRentReceipt(RentReceiptDraftRequest request) {
        if (request == null) {
            throw new BusinessException("DRAFT_REQUIRED", "Le brouillon est obligatoire.");
        }
        YearMonth month = Amounts.month(request.month());
        if (request.landlordId() == null) {
            throw new BusinessException("DRAFT_LANDLORD_REQUIRED", "Le bailleur du brouillon est obligatoire.");
        }
        requireSingleTenant(request.tenantId(), request.tenantCompanyId());
        String periodStart = date(request.periodStart(), "date de début");
        String periodEnd = date(request.periodEnd(), "date de fin");
        requirePeriodOrder(periodStart, periodEnd);
        return new RentReceiptDraftRequest(
                month.toString(),
                request.landlordId(),
                request.tenantId(),
                request.tenantCompanyId(),
                periodStart,
                periodEnd,
                amount(request.rentExclCharges(), "loyer hors charges"),
                amount(request.charges(), "charges"),
                date(request.paymentDate(), "date de paiement"),
                date(request.issueDate(), "date d'émission"),
                request.templateId());
    }

    private StatementDraftRequest normalizeStatement(StatementDraftRequest request) {
        if (request == null) {
            throw new BusinessException("DRAFT_REQUIRED", "Le brouillon est obligatoire.");
        }
        if (request.companyId() == null) {
            throw new BusinessException("DRAFT_COMPANY_REQUIRED", "La société du brouillon est obligatoire.");
        }
        YearMonth month = Amounts.month(request.month());
        List<ExpenseLineRequest> lines = request.lines() == null
                ? List.of()
                : request.lines().stream().map(this::normalizeLine).toList();
        return new StatementDraftRequest(
                request.companyId(),
                month.toString(),
                request.templateId(),
                request.complete() == null || request.complete(),
                lines);
    }

    private ExpenseLineRequest normalizeLine(ExpenseLineRequest line) {
        if (line == null) {
            throw new BusinessException("DRAFT_LINE_INVALID", "Une ligne du brouillon est invalide.");
        }
        if (line.itemCode() == null || line.itemCode().isBlank()) {
            throw new BusinessException("DRAFT_LINE_ITEM_REQUIRED", "Le poste d'une ligne du brouillon est obligatoire.");
        }
        String amountSource = line.amountSource();
        if (amountSource != null && !AMOUNT_SOURCES.contains(amountSource)) {
            throw new BusinessException("DRAFT_LINE_SOURCE_INVALID", "L'origine du montant d'une ligne est invalide.");
        }
        String confidence = line.aiConfidence();
        if (confidence != null && !CONFIDENCES.contains(confidence)) {
            throw new BusinessException("DRAFT_LINE_CONFIDENCE_INVALID",
                    "La confiance d'une ligne du brouillon est invalide.");
        }
        return new ExpenseLineRequest(
                line.itemCode().trim(),
                Amounts.decimal(line.amountInclVat(), "montant TTC", false).toPlainString(),
                Amounts.percentage(line.proRataPct()).toPlainString(),
                line.receiptId(),
                amountSource,
                line.aiDetectedAmount(),
                confidence);
    }

    private void requireSingleTenant(Long tenantId, Long tenantCompanyId) {
        if ((tenantId == null) == (tenantCompanyId == null)) {
            throw new BusinessException("DRAFT_TENANT_REQUIRED",
                    "Le brouillon de quittance doit viser exactement un locataire.");
        }
    }

    private void requirePeriodOrder(String start, String end) {
        if (!start.isEmpty() && !end.isEmpty() && LocalDate.parse(start).isAfter(LocalDate.parse(end))) {
            throw new BusinessException("DRAFT_PERIOD_INVALID",
                    "La date de début de la période doit précéder sa date de fin.");
        }
    }

    private String amount(String value, String field) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return Amounts.decimal(value, field, false).toPlainString();
    }

    private String date(String value, String field) {
        LocalDate parsed = Amounts.optionalDate(value, field);
        return parsed == null ? "" : parsed.toString();
    }

    private RentReceiptDraftDto toRentReceiptDto(DocumentDraft entity) {
        RentReceiptDraftRequest request = read(entity.getPayload(), RentReceiptDraftRequest.class);
        return new RentReceiptDraftDto(
                entity.getId(),
                request.month(),
                request.landlordId(),
                request.tenantId(),
                request.tenantCompanyId(),
                request.periodStart(),
                request.periodEnd(),
                request.rentExclCharges(),
                request.charges(),
                request.paymentDate(),
                request.issueDate(),
                request.templateId(),
                entity.getSavedAt());
    }

    private StatementDraftDto toStatementDto(DocumentDraft entity) {
        StatementDraftRequest request = read(entity.getPayload(), StatementDraftRequest.class);
        return new StatementDraftDto(
                entity.getId(),
                request.companyId(),
                request.month(),
                request.templateId(),
                Boolean.TRUE.equals(request.complete()),
                request.lines() == null ? List.of() : request.lines(),
                entity.getSavedAt());
    }

    private <T> T read(String payload, Class<T> type) {
        try {
            return mapper.readValue(payload, type);
        } catch (RuntimeException ex) {
            throw new IllegalStateException("Brouillon illisible.", ex);
        }
    }
}
