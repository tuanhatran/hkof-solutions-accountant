package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.DocumentStatus;

public interface RentReceiptRepository extends JpaRepository<RentReceipt, Long> {

    List<RentReceipt> findByMonthOrderByVersionDesc(String month);

    List<RentReceipt> findAllByOrderByMonthDescVersionDesc();

    Optional<RentReceipt> findFirstByMonthAndStatusOrderByVersionDesc(String month, DocumentStatus status);

    Optional<RentReceipt> findFirstByMonthOrderByVersionDesc(String month);
}
