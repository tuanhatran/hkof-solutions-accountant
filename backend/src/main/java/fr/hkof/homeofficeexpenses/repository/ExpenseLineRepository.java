package fr.hkof.homeofficeexpenses.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.ExpenseLine;

public interface ExpenseLineRepository extends JpaRepository<ExpenseLine, Long> {

    boolean existsByReceiptId(Long receiptId);
}
