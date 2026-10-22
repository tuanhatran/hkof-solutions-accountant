package fr.hkof.homeofficeexpenses.service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Periodicity;
import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.ExpenseItemDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.ExpenseItemRequest;

@Service
public class ExpenseItemService {

    private final ExpenseItemRepository repository;

    public ExpenseItemService(ExpenseItemRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ExpenseItemDto> lister(boolean tous) {
        List<ExpenseItem> items = tous
                ? repository.findByDeletedFalseOrderBySortOrderAsc()
                : repository.findByDeletedFalseAndActiveTrueOrderBySortOrderAsc();
        return items.stream().map(this::versDto).toList();
    }

    @Transactional(readOnly = true)
    public ExpenseItem entity(String code) {
        return repository.findByCodeAndDeletedFalse(code)
                .orElseThrow(() -> new BusinessException("Type de frais inconnu : " + code));
    }

    @Transactional
    public ExpenseItemDto creer(ExpenseItemRequest request) {
        if (request.label() == null || request.label().isBlank()) {
            throw new BusinessException("Le libellé du poste est obligatoire.");
        }
        String code = request.code() == null || request.code().isBlank()
                ? genererCode(request.label())
                : normaliserCode(request.code());
        if (repository.existsByCode(code)) {
            throw new BusinessException("Un poste avec le code « " + code + " » existe déjà.");
        }
        ExpenseItem expenseItem = new ExpenseItem();
        expenseItem.setCode(code);
        appliquer(expenseItem, request);
        expenseItem.setDeleted(false);
        return versDto(repository.save(expenseItem));
    }

    @Transactional
    public ExpenseItemDto mettreAJour(Long id, ExpenseItemRequest request) {
        ExpenseItem expenseItem = repository.findById(id)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new NotFoundException("Poste introuvable."));
        appliquer(expenseItem, request);
        return versDto(repository.save(expenseItem));
    }

    @Transactional
    public void delete(Long id) {
        ExpenseItem expenseItem = repository.findById(id)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new NotFoundException("Poste introuvable."));
        expenseItem.setDeleted(true);
        expenseItem.setActive(false);
        repository.save(expenseItem);
    }

    private void appliquer(ExpenseItem expenseItem, ExpenseItemRequest request) {
        if (request.label() == null || request.label().isBlank()) {
            throw new BusinessException("Le libellé du poste est obligatoire.");
        }
        expenseItem.setLabel(request.label().trim());
        expenseItem.setSupplier(request.supplier() == null ? null : request.supplier().trim());
        expenseItem.setProRataPct(Amounts.pourcentage(request.proRataPct()));
        expenseItem.setPeriodicity(periodicity(request.periodicity()));
        expenseItem.setActive(request.active() == null || request.active());
        expenseItem.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        expenseItem.setMultipleLinesAllowed(Boolean.TRUE.equals(request.multipleLinesAllowed()));
    }

    private Periodicity periodicity(String value) {
        if (value == null || value.isBlank()) {
            return Periodicity.MENSUELLE;
        }
        try {
            return Periodicity.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Périodicité invalide : " + value);
        }
    }

    private String normaliserCode(String value) {
        String code = Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-zA-Z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toLowerCase(Locale.ROOT);
        if (code.isBlank()) {
            throw new BusinessException("Le code du poste est invalide.");
        }
        return code;
    }

    private String genererCode(String label) {
        return normaliserCode(label);
    }

    public ExpenseItemDto versDto(ExpenseItem p) {
        return new ExpenseItemDto(
                p.getId(),
                p.getCode(),
                p.getLabel(),
                p.getSupplier(),
                Amounts.apiValue(p.getProRataPct()),
                p.getPeriodicity().name(),
                p.isActive(),
                p.getSortOrder(),
                p.isMultipleLinesAllowed());
    }
}
