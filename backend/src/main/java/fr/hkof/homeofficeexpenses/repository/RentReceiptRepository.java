package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.DocumentStatus;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;

public interface RentReceiptRepository extends JpaRepository<RentReceipt, Long> {

    List<RentReceipt> findByMonthOrderByVersionDescIdDesc(String month);

    List<RentReceipt> findByCompanyIdAndMonthOrderByVersionDescIdDesc(Long companyId, String month);

    List<RentReceipt> findByCompanyIdOrderByMonthDescVersionDescIdDesc(Long companyId);

    List<RentReceipt> findAllByOrderByMonthDescVersionDescIdDesc();

    Optional<RentReceipt> findFirstByCompanyIdAndMonthAndStatusOrderByVersionDescIdDesc(Long companyId, String month,
            DocumentStatus status);

    Optional<RentReceipt> findFirstByMonthAndStatusOrderByVersionDescIdDesc(String month, DocumentStatus status);

    Optional<RentReceipt> findFirstByMonthAndLandlordIdAndTenantIdAndStatusOrderByVersionDescIdDesc(
            String month, Long landlordId, Long tenantId, DocumentStatus status);

    Optional<RentReceipt> findFirstByMonthAndLandlordIdAndTenantCompanyIdAndStatusOrderByVersionDescIdDesc(
            String month, Long landlordId, Long tenantCompanyId, DocumentStatus status);

    Optional<RentReceipt> findFirstByMonthAndLandlordIdAndTenantIdOrderByVersionDescIdDesc(
            String month, Long landlordId, Long tenantId);

    Optional<RentReceipt> findFirstByMonthAndLandlordIdAndTenantCompanyIdOrderByVersionDescIdDesc(
            String month, Long landlordId, Long tenantCompanyId);

    boolean existsByCompanyId(Long companyId);
}
