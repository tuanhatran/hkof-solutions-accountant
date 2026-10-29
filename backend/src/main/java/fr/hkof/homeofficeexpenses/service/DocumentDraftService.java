package fr.hkof.homeofficeexpenses.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.ObjectMapper;

import fr.hkof.homeofficeexpenses.domain.DocumentDraft;
import fr.hkof.homeofficeexpenses.repository.DocumentDraftRepository;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.RentReceiptDraftDto;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.RentReceiptDraftRequest;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.StatementDraftDto;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.StatementDraftRequest;

/**
 * Persists the editable form state of the two generation pages. A draft is never a
 * document: only validated form values are stored, no total is computed here. One scope
 * holds at most one active draft; each save inserts a new row and logically deletes the
 * previous active row of the same scope.
 */
@Service
public class DocumentDraftService {

    private final DocumentDraftRepository repository;
    private final LeaseService leases;
    private final OwnershipContext ownership;
    private final ObjectMapper mapper;
    private final Clock clock;

    public DocumentDraftService(DocumentDraftRepository repository, LeaseService leases,
            OwnershipContext ownership, ObjectMapper mapper, Clock clock) {
        this.repository = repository;
        this.leases = leases;
        this.ownership = ownership;
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
        StatementDraftRequest normalized = StatementDraftNormalizer.normalize(request);
        requireLeaseInCompany(normalized.companyId(), normalized.leaseId());
        findActiveStatement(normalized.month(), normalized.companyId(), normalized.leaseId())
                .ifPresent(this::softDelete);
        DocumentDraft entity = newEntity(DocumentDraft.Type.EXPENSE_STATEMENT, normalized.month(), normalized);
        entity.setCompanyId(normalized.companyId());
        entity.setLeaseId(normalized.leaseId());
        return toStatementDto(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public Optional<StatementDraftDto> findStatement(Long companyId, String month, Long leaseId) {
        if (companyId == null) {
            throw new BusinessException("DRAFT_COMPANY_REQUIRED", "La société du brouillon est obligatoire.");
        }
        requireLeaseInCompany(companyId, leaseId);
        return findActiveStatement(Amounts.month(month).toString(), companyId, leaseId).map(this::toStatementDto);
    }

    @Transactional
    public void delete(Long id) {
        DocumentDraft draft = repository.findByIdAndUserIdAndDeletedFalse(id, ownership.currentUserId())
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
    public void deleteActiveStatement(Long companyId, String month, Long leaseId) {
        if (companyId == null) {
            return;
        }
        findActiveStatement(Amounts.month(month).toString(), companyId, leaseId).ifPresent(this::softDelete);
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
        Long ownerId = ownership.currentUserId();
        return tenantId != null
                ? repository.findFirstByUserIdAndTypeAndMonthAndLandlordIdAndTenantIdAndDeletedFalseOrderByIdDesc(
                        ownerId, DocumentDraft.Type.RENT_RECEIPT, month, landlordId, tenantId)
                : repository.findFirstByUserIdAndTypeAndMonthAndLandlordIdAndTenantCompanyIdAndDeletedFalseOrderByIdDesc(
                        ownerId, DocumentDraft.Type.RENT_RECEIPT, month, landlordId, tenantCompanyId);
    }

    private Optional<DocumentDraft> findActiveStatement(String month, Long companyId, Long leaseId) {
        Long ownerId = ownership.currentUserId();
        return leaseId == null
                ? repository.findFirstByUserIdAndTypeAndMonthAndCompanyIdAndLeaseIdIsNullAndDeletedFalseOrderByIdDesc(
                        ownerId, DocumentDraft.Type.EXPENSE_STATEMENT, month, companyId)
                : repository.findFirstByUserIdAndTypeAndMonthAndCompanyIdAndLeaseIdAndDeletedFalseOrderByIdDesc(
                        ownerId, DocumentDraft.Type.EXPENSE_STATEMENT, month, companyId, leaseId);
    }

    /** Rejects a lease of another company so a draft can never leak across companies. */
    private void requireLeaseInCompany(Long companyId, Long leaseId) {
        if (leaseId != null) {
            leases.resolveExpenseLease(companyId, leaseId);
        }
    }

    /**
     * Flushes the logical deletion immediately: Hibernate flushes inserts before updates,
     * so a pending update would let the next insert hit the V15 partial unique indexes
     * while the previous row still looks active.
     */
    private void softDelete(DocumentDraft draft) {
        draft.setDeleted(true);
        repository.saveAndFlush(draft);
    }

    private DocumentDraft newEntity(DocumentDraft.Type type, String month, Object payload) {
        DocumentDraft entity = new DocumentDraft();
        entity.setUserId(ownership.currentUserId());
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
                request.templateId(),
                RentReceiptAdditionalCharges.normalize(request.additionalCharges()));
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
                entity.getSavedAt(),
                request.additionalCharges() == null ? List.of() : request.additionalCharges());
    }

    private StatementDraftDto toStatementDto(DocumentDraft entity) {
        StatementDraftRequest request = read(entity.getPayload(), StatementDraftRequest.class);
        return new StatementDraftDto(
                entity.getId(),
                request.companyId(),
                request.month(),
                request.leaseId(),
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
