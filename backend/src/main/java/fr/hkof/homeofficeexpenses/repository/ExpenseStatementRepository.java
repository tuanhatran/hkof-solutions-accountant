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
    List<ExpenseStatement> findByCompanyIdAndMonthOrderByVersionDesc(Long companyId, String month);

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    List<ExpenseStatement> findByCompanyIdOrderByMonthDescVersionDesc(Long companyId);

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    @Query("select n from ExpenseStatement n where n.id = :id")
    Optional<ExpenseStatement> findWithLinesById(@Param("id") Long id);

    Optional<ExpenseStatement> findFirstByCompanyIdAndMonthOrderByVersionDesc(Long companyId, String month);

    Optional<ExpenseStatement> findFirstByCompanyIdAndMonthAndLeaseIdOrderByVersionDesc(Long companyId, String month,
            Long leaseId);

    Optional<ExpenseStatement> findFirstByCompanyIdAndMonthAndLeaseIdIsNullOrderByVersionDesc(Long companyId,
            String month);

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    Optional<ExpenseStatement> findFirstByCompanyIdAndMonthAndStatusOrderByVersionDesc(Long companyId, String month,
            DocumentStatus status);

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    Optional<ExpenseStatement> findFirstByCompanyIdAndMonthAndLeaseIdAndStatusOrderByVersionDesc(Long companyId,
            String month, Long leaseId, DocumentStatus status);

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    Optional<ExpenseStatement> findFirstByCompanyIdAndMonthAndLeaseIdIsNullAndStatusOrderByVersionDesc(Long companyId,
            String month, DocumentStatus status);

    boolean existsByCompanyId(Long companyId);
}
