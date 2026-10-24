package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.ExpenseItem;

public interface ExpenseItemRepository extends JpaRepository<ExpenseItem, Long> {

    List<ExpenseItem> findByCompanyIdAndDeletedFalseOrderBySortOrderAscIdAsc(Long companyId);

    List<ExpenseItem> findByCompanyIdAndDeletedFalseAndActiveTrueOrderBySortOrderAscIdAsc(Long companyId);

    Optional<ExpenseItem> findByCompanyIdAndCodeAndDeletedFalse(Long companyId, String code);

    Optional<ExpenseItem> findFirstByCompanyIdAndCode(Long companyId, String code);

    boolean existsByCompanyIdAndCode(Long companyId, String code);

    boolean existsByCompanyIdAndDeletedFalse(Long companyId);
}
