package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.ExpenseItem;

public interface ExpenseItemRepository extends JpaRepository<ExpenseItem, Long> {

    List<ExpenseItem> findByCompanyIdAndDeletedFalseOrderBySortOrderAscIdAsc(Long companyId);

    List<ExpenseItem> findByUserIdAndCompanyIdAndDeletedFalseOrderBySortOrderAscIdAsc(Long userId, Long companyId);

    List<ExpenseItem> findByCompanyIdAndDeletedFalseAndActiveTrueOrderBySortOrderAscIdAsc(Long companyId);

    List<ExpenseItem> findByUserIdAndCompanyIdAndDeletedFalseAndActiveTrueOrderBySortOrderAscIdAsc(Long userId,
            Long companyId);

    /** Every scope of a code in a company; null lease is the inherited scope shared by all leases. */
    List<ExpenseItem> findByCompanyIdAndCode(Long companyId, String code);

    List<ExpenseItem> findByUserIdAndCompanyIdAndCode(Long userId, Long companyId, String code);

    Optional<ExpenseItem> findFirstByUserIdAndCompanyIdAndCode(Long userId, Long companyId, String code);

    Optional<ExpenseItem> findFirstByCompanyIdAndLeaseIdAndCodeAndDeletedFalse(Long companyId, Long leaseId,
            String code);

    Optional<ExpenseItem> findFirstByUserIdAndCompanyIdAndLeaseIdAndCodeAndDeletedFalse(Long userId, Long companyId,
            Long leaseId, String code);

    Optional<ExpenseItem> findFirstByCompanyIdAndLeaseIdIsNullAndCodeAndDeletedFalse(Long companyId, String code);

    Optional<ExpenseItem> findFirstByUserIdAndCompanyIdAndLeaseIdIsNullAndCodeAndDeletedFalse(Long userId,
            Long companyId, String code);

    Optional<ExpenseItem> findByIdAndUserId(Long id, Long userId);

    Optional<ExpenseItem> findFirstByCompanyIdAndCode(Long companyId, String code);

    boolean existsByCompanyIdAndDeletedFalse(Long companyId);
}
