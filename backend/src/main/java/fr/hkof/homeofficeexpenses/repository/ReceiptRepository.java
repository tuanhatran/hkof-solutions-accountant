package fr.hkof.homeofficeexpenses.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Receipt;

public interface ReceiptRepository extends JpaRepository<Receipt, Long> {
}
