package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.ExpenseItem;

public interface ExpenseItemRepository extends JpaRepository<ExpenseItem, Long> {

    List<ExpenseItem> findByDeletedFalseOrderBySortOrderAsc();

    List<ExpenseItem> findByDeletedFalseAndActiveTrueOrderBySortOrderAsc();

    Optional<ExpenseItem> findByCodeAndDeletedFalse(String code);

    Optional<ExpenseItem> findFirstByCode(String code);

    boolean existsByCode(String code);
}
