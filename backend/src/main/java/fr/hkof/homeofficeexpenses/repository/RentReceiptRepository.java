package fr.hkof.homeofficeexpenses.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.DocumentStatus;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;

public interface RentReceiptRepository extends JpaRepository<RentReceipt, Long> {

    Optional<RentReceipt> findByIdAndUserId(Long id, Long userId);

    List<RentReceipt> findByUserIdAndMonthOrderByVersionDescIdDesc(Long userId, String month);

    List<RentReceipt> findByUserIdAndCompanyIdAndMonthOrderByVersionDescIdDesc(Long userId, Long companyId,
            String month);

    List<RentReceipt> findByUserIdAndCompanyIdOrderByMonthDescVersionDescIdDesc(Long userId, Long companyId);

    List<RentReceipt> findAllByUserIdOrderByMonthDescVersionDescIdDesc(Long userId);

    Optional<RentReceipt> findFirstByUserIdAndCompanyIdAndMonthAndStatusOrderByVersionDescIdDesc(Long userId,
            Long companyId, String month, DocumentStatus status);

    Optional<RentReceipt> findFirstByUserIdAndMonthAndStatusOrderByVersionDescIdDesc(Long userId, String month,
            DocumentStatus status);

    Optional<RentReceipt> findFirstByUserIdAndMonthAndLandlordIdAndTenantIdAndStatusOrderByVersionDescIdDesc(
            Long userId, String month, Long landlordId, Long tenantId, DocumentStatus status);

    Optional<RentReceipt> findFirstByUserIdAndMonthAndLandlordIdAndTenantCompanyIdAndStatusOrderByVersionDescIdDesc(
            Long userId, String month, Long landlordId, Long tenantCompanyId, DocumentStatus status);

    Optional<RentReceipt> findFirstByUserIdAndMonthAndLandlordIdAndTenantIdOrderByVersionDescIdDesc(
            Long userId, String month, Long landlordId, Long tenantId);

    Optional<RentReceipt> findFirstByUserIdAndMonthAndLandlordIdAndTenantCompanyIdOrderByVersionDescIdDesc(
            Long userId, String month, Long landlordId, Long tenantCompanyId);

    boolean existsByCompanyId(Long companyId);

    List<RentReceipt> findByTenantCompanyIdInAndUserIdNotOrderByMonthDescVersionDescIdDesc(
            Collection<Long> tenantCompanyIds, Long userId);

    List<RentReceipt> findByTenantCompanyIdInAndUserIdNotAndMonthOrderByVersionDescIdDesc(
            Collection<Long> tenantCompanyIds, Long userId, String month);

    Optional<RentReceipt> findFirstByTenantCompanyIdAndMonthAndUserIdNotAndStatusOrderByVersionDescIdDesc(
            Long tenantCompanyId, String month, Long userId, DocumentStatus status);
}
