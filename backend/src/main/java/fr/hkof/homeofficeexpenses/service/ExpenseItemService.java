package fr.hkof.homeofficeexpenses.service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.Periodicity;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.web.dto.ExpenseItemDtos.ExpenseItemDto;
import fr.hkof.homeofficeexpenses.web.dto.ExpenseItemDtos.ExpenseItemRequest;

/**
 * Expense items are owned by one company and one lease scope. Codes are unique per scope: the
 * company-global inherited rows (null lease) collide with every lease, while two leases of the
 * same company may reuse a code.
 */
@Service
public class ExpenseItemService {

    private final ExpenseItemRepository repository;
    private final CompanyService companies;
    private final LeaseService leases;
    private final OwnershipContext ownership;

    public ExpenseItemService(ExpenseItemRepository repository, CompanyService companies, LeaseService leases,
            OwnershipContext ownership) {
        this.repository = repository;
        this.companies = companies;
        this.leases = leases;
        this.ownership = ownership;
    }

    @Transactional(readOnly = true)
    public List<ExpenseItemDto> list(Long companyId, Long leaseId, boolean includeDeleted) {
        companies.entity(companyId);
        var lease = leaseId == null ? null : leases.resolveExpenseLease(companyId, leaseId);
        Long owner = ownership.currentUserId();
        List<ExpenseItem> items = includeDeleted
                ? repository.findByUserIdAndCompanyIdAndDeletedFalseOrderBySortOrderAscIdAsc(owner, companyId)
                : repository.findByUserIdAndCompanyIdAndDeletedFalseAndActiveTrueOrderBySortOrderAscIdAsc(owner,
                        companyId);
        return items.stream()
                .filter(item -> lease == null || item.getLeaseId() == null
                        || item.getLeaseId().equals(lease.getId()))
                .map(this::toDto)
                .toList();
    }

    /**
     * Resolves the item visible from a lease: its own item first, then the inherited company one.
     */
    @Transactional(readOnly = true)
    public ExpenseItem entity(Long companyId, Long leaseId, String code) {
        Long owner = ownership.currentUserId();
        Optional<ExpenseItem> exact = leaseId == null
                ? Optional.empty()
                : repository.findFirstByUserIdAndCompanyIdAndLeaseIdAndCodeAndDeletedFalse(owner, companyId, leaseId,
                        code);
        return exact.or(() -> repository.findFirstByUserIdAndCompanyIdAndLeaseIdIsNullAndCodeAndDeletedFalse(owner,
                companyId, code))
                .orElseThrow(() -> new BusinessException("EXPENSE_ITEM_UNKNOWN_CODE",
                        "Type de frais inconnu : " + code, Map.of("code", code)));
    }

    @Transactional
    public ExpenseItemDto create(ExpenseItemRequest request) {
        if (request.companyId() == null) {
            throw new BusinessException("COMPANY_REQUIRED", "Sélectionnez une société.");
        }
        companies.entity(request.companyId());
        if (request.leaseId() != null) {
            leases.resolveExpenseLease(request.companyId(), request.leaseId());
        }
        if (request.label() == null || request.label().isBlank()) {
            throw new BusinessException("EXPENSE_ITEM_LABEL_REQUIRED", "Le libellé du poste est obligatoire.");
        }
        String code = request.code() == null || request.code().isBlank()
                ? generateCode(request.label())
                : normalizeCode(request.code());
        rejectDuplicate(request.companyId(), request.leaseId(), code, null);
        ExpenseItem expenseItem = new ExpenseItem();
        expenseItem.setUserId(ownership.currentUserId());
        expenseItem.setCompanyId(request.companyId());
        expenseItem.setLeaseId(request.leaseId());
        expenseItem.setCode(code);
        apply(expenseItem, request);
        expenseItem.setDeleted(false);
        return toDto(repository.save(expenseItem));
    }

    @Transactional
    public ExpenseItemDto update(Long id, ExpenseItemRequest request) {
        ExpenseItem expenseItem = activeItem(id);
        if (request.leaseId() != null) {
            leases.resolveExpenseLease(expenseItem.getCompanyId(), request.leaseId());
        }
        rejectDuplicate(expenseItem.getCompanyId(), request.leaseId(), expenseItem.getCode(), id);
        expenseItem.setLeaseId(request.leaseId());
        apply(expenseItem, request);
        return toDto(repository.save(expenseItem));
    }

    @Transactional
    public void delete(Long id) {
        ExpenseItem expenseItem = activeItem(id);
        expenseItem.setDeleted(true);
        expenseItem.setActive(false);
        repository.save(expenseItem);
    }

    /**
     * Rejects a code already visible from the target scope. The company-global inherited scope is
     * visible from every lease, so inherited rows collide with all of them and a lease item blocks
     * the inherited scope of its company. Deleted rows keep reserving their code.
     */
    private void rejectDuplicate(Long companyId, Long leaseId, String code, Long excludedId) {
        boolean duplicate = repository.findByUserIdAndCompanyIdAndCode(ownership.currentUserId(), companyId, code)
                .stream()
                .filter(item -> excludedId == null || !excludedId.equals(item.getId()))
                .anyMatch(item -> visibleFrom(item, leaseId));
        if (duplicate) {
            throw new BusinessException("EXPENSE_ITEM_CODE_DUPLICATE",
                    "Un poste avec le code « " + code + " » existe déjà.", Map.of("code", code));
        }
    }

    private boolean visibleFrom(ExpenseItem item, Long leaseId) {
        if (leaseId == null) {
            return true;
        }
        return item.getLeaseId() == null || leaseId.equals(item.getLeaseId());
    }

    private ExpenseItem activeItem(Long id) {
        return repository.findByIdAndUserId(id, ownership.currentUserId())
                .filter(item -> !item.isDeleted())
                .orElseThrow(() -> new NotFoundException("EXPENSE_ITEM_NOT_FOUND", "Poste introuvable."));
    }

    private void apply(ExpenseItem expenseItem, ExpenseItemRequest request) {
        if (request.label() == null || request.label().isBlank()) {
            throw new BusinessException("EXPENSE_ITEM_LABEL_REQUIRED", "Le libellé du poste est obligatoire.");
        }
        expenseItem.setLabel(request.label().trim());
        expenseItem.setSupplier(request.supplier() == null ? null : request.supplier().trim());
        expenseItem.setProRataPct(Amounts.percentage(request.proRataPct()));
        expenseItem.setPeriodicity(periodicity(request.periodicity()));
        expenseItem.setActive(request.active() == null || request.active());
        expenseItem.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        expenseItem.setMultipleLinesAllowed(Boolean.TRUE.equals(request.multipleLinesAllowed()));
    }

    private Periodicity periodicity(String value) {
        if (value == null || value.isBlank()) {
            return Periodicity.MONTHLY;
        }
        try {
            return Periodicity.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("EXPENSE_ITEM_PERIODICITY_INVALID", "Périodicité invalide : " + value,
                    Map.of("periodicity", value));
        }
    }

    private String normalizeCode(String value) {
        String code = Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-zA-Z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toLowerCase(Locale.ROOT);
        if (code.isBlank()) {
            throw new BusinessException("EXPENSE_ITEM_CODE_INVALID", "Le code du poste est invalide.");
        }
        return code;
    }

    private String generateCode(String label) {
        return normalizeCode(label);
    }

    public ExpenseItemDto toDto(ExpenseItem expenseItem) {
        return new ExpenseItemDto(
                expenseItem.getId(),
                expenseItem.getCompanyId(),
                expenseItem.getLeaseId(),
                expenseItem.getCode(),
                expenseItem.getLabel(),
                expenseItem.getSupplier(),
                Amounts.apiValue(expenseItem.getProRataPct()),
                expenseItem.getPeriodicity().name(),
                expenseItem.isActive(),
                expenseItem.getSortOrder(),
                expenseItem.isMultipleLinesAllowed());
    }
}
