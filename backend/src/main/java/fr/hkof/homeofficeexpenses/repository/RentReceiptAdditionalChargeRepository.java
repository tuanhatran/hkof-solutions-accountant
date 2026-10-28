package fr.hkof.homeofficeexpenses.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.RentReceiptAdditionalCharge;

public interface RentReceiptAdditionalChargeRepository extends JpaRepository<RentReceiptAdditionalCharge, Long> {
}
