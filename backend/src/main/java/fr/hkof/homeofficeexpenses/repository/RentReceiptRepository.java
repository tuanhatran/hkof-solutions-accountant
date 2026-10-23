package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.DocumentStatus;

public interface RentReceiptRepository extends JpaRepository<RentReceipt, Long> {

    List<RentReceipt> findByMonthOrderByVersionDescIdDesc(String month);

    List<RentReceipt> findAllByOrderByMonthDescVersionDescIdDesc();

    Optional<RentReceipt> findFirstByMonthAndStatusOrderByVersionDescIdDesc(String month, DocumentStatus status);

    Optional<RentReceipt> findFirstByMonthAndLandlordIdAndTenantIdAndStatusOrderByVersionDescIdDesc(
            String month, Long landlordId, Long tenantId, DocumentStatus status);

    Optional<RentReceipt> findFirstByMonthAndLandlordIdAndTenantIdOrderByVersionDescIdDesc(
            String month, Long landlordId, Long tenantId);
}
