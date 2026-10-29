package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import fr.hkof.homeofficeexpenses.domain.DocumentStatus;
import fr.hkof.homeofficeexpenses.domain.ExpenseStatement;

public interface ExpenseStatementRepository extends JpaRepository<ExpenseStatement, Long> {

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    List<ExpenseStatement> findByUserIdAndCompanyIdAndMonthOrderByVersionDesc(Long userId, Long companyId,
            String month);

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    List<ExpenseStatement> findByUserIdAndCompanyIdOrderByMonthDescVersionDesc(Long userId, Long companyId);

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    @Query("select n from ExpenseStatement n where n.id = :id and n.userId = :userId")
    Optional<ExpenseStatement> findWithLinesByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    Optional<ExpenseStatement> findFirstByUserIdAndCompanyIdAndMonthAndLeaseIdOrderByVersionDesc(Long userId,
            Long companyId, String month, Long leaseId);

    Optional<ExpenseStatement> findFirstByUserIdAndCompanyIdAndMonthAndLeaseIdIsNullOrderByVersionDesc(Long userId,
            Long companyId, String month);

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    Optional<ExpenseStatement> findFirstByUserIdAndCompanyIdAndMonthAndStatusOrderByVersionDesc(Long userId,
            Long companyId, String month, DocumentStatus status);

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    Optional<ExpenseStatement> findFirstByUserIdAndCompanyIdAndMonthAndLeaseIdAndStatusOrderByVersionDesc(
            Long userId, Long companyId, String month, Long leaseId, DocumentStatus status);

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    Optional<ExpenseStatement> findFirstByUserIdAndCompanyIdAndMonthAndLeaseIdIsNullAndStatusOrderByVersionDesc(
            Long userId, Long companyId, String month, DocumentStatus status);

    boolean existsByCompanyId(Long companyId);
}
