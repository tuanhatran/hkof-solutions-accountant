package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import fr.hkof.homeofficeexpenses.domain.ExpenseStatement;
import fr.hkof.homeofficeexpenses.domain.DocumentStatus;

public interface ExpenseStatementRepository extends JpaRepository<ExpenseStatement, Long> {

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    List<ExpenseStatement> findByMonthOrderByVersionDesc(String month);

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    List<ExpenseStatement> findAllByOrderByMonthDescVersionDesc();

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    @Query("select n from ExpenseStatement n where n.id = :id")
    Optional<ExpenseStatement> findWithLinesById(@Param("id") Long id);

    Optional<ExpenseStatement> findFirstByMonthOrderByVersionDesc(String month);

    @EntityGraph(attributePaths = {"lines", "lines.expenseItem", "lines.receipt"})
    Optional<ExpenseStatement> findFirstByMonthAndStatusOrderByVersionDesc(String month, DocumentStatus status);
}
