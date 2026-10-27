package fr.hkof.homeofficeexpenses.service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.Periodicity;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.web.dto.ExpenseItemDtos.ExpenseItemDto;
import fr.hkof.homeofficeexpenses.web.dto.ExpenseItemDtos.ExpenseItemRequest;

/**
 * Expense items are owned by one company; codes are unique inside a company only.
 */
@Service
public class ExpenseItemService {

    private final ExpenseItemRepository repository;
    private final CompanyService companies;
    private final LeaseService leases;

    public ExpenseItemService(ExpenseItemRepository repository, CompanyService companies, LeaseService leases) {
        this.repository = repository;
        this.companies = companies;
        this.leases = leases;
    }

    @Transactional(readOnly = true)
    public List<ExpenseItemDto> list(Long companyId, Long leaseId, boolean includeDeleted) {
        companies.entity(companyId);
        var lease = leaseId == null ? null : leases.resolveExpenseLease(companyId, leaseId);
        List<ExpenseItem> items = includeDeleted
                ? repository.findByCompanyIdAndDeletedFalseOrderBySortOrderAscIdAsc(companyId)
                : repository.findByCompanyIdAndDeletedFalseAndActiveTrueOrderBySortOrderAscIdAsc(companyId);
        return items.stream()
                .filter(item -> lease == null || item.getLeaseId() == null
                        || item.getLeaseId().equals(lease.getId()))
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ExpenseItem entity(Long companyId, String code) {
        return repository.findByCompanyIdAndCodeAndDeletedFalse(companyId, code)
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
        if (repository.existsByCompanyIdAndCode(request.companyId(), code)) {
            throw new BusinessException("EXPENSE_ITEM_CODE_DUPLICATE",
                    "Un poste avec le code « " + code + " » existe déjà.", Map.of("code", code));
        }
        ExpenseItem expenseItem = new ExpenseItem();
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

    private ExpenseItem activeItem(Long id) {
        return repository.findById(id)
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
