package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Lease;

public interface LeaseRepository extends JpaRepository<Lease, Long> {

    List<Lease> findAllByDeletedFalseOrderByIdAsc();

    List<Lease> findAllByUserIdAndDeletedFalseOrderByIdAsc(Long userId);

    List<Lease> findAllByCompanyIdAndDeletedFalse(Long companyId);

    List<Lease> findAllByUserIdAndCompanyIdAndDeletedFalse(Long userId, Long companyId);

    Optional<Lease> findFirstByCompanyIdAndDeletedFalseOrderByIdAsc(Long companyId);

    Optional<Lease> findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(Long userId, Long companyId);

    Optional<Lease> findByIdAndDeletedFalse(Long id);

    Optional<Lease> findByIdAndUserIdAndDeletedFalse(Long id, Long userId);

    Optional<Lease> findFirstByLandlordIdAndTenantIdAndDeletedFalse(Long landlordId, Long tenantId);

    Optional<Lease> findFirstByUserIdAndLandlordIdAndTenantIdAndDeletedFalse(Long userId, Long landlordId,
            Long tenantId);

    Optional<Lease> findFirstByLandlordIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalse(Long landlordId,
            Long companyId);

    Optional<Lease> findFirstByUserIdAndLandlordIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalse(Long userId,
            Long landlordId, Long companyId);

    Optional<Lease> findFirstByDeletedFalseOrderByIdAsc();

    Optional<Lease> findFirstByUserIdAndDeletedFalseOrderByIdAsc(Long userId);

    boolean existsByLandlordIdAndTenantIdAndDeletedFalse(Long landlordId, Long tenantId);

    boolean existsByLandlordIdAndTenantIdAndDeletedFalseAndIdNot(Long landlordId, Long tenantId, Long id);

    boolean existsByUserIdAndLandlordIdAndTenantIdAndDeletedFalse(Long userId, Long landlordId, Long tenantId);

    boolean existsByUserIdAndLandlordIdAndTenantIdAndDeletedFalseAndIdNot(Long userId, Long landlordId, Long tenantId,
            Long id);

    boolean existsByLandlordIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalse(Long landlordId, Long companyId);

    boolean existsByLandlordIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalseAndIdNot(Long landlordId, Long companyId,
            Long id);

    boolean existsByUserIdAndLandlordIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalse(Long userId, Long landlordId,
            Long companyId);

    boolean existsByUserIdAndLandlordIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalseAndIdNot(Long userId,
            Long landlordId, Long companyId, Long id);

    boolean existsByLandlordIdAndDeletedFalse(Long landlordId);

    boolean existsByTenantIdAndDeletedFalse(Long tenantId);

    boolean existsByCompanyIdAndCompanyLeaseFalseAndDeletedFalse(Long companyId);

    boolean existsByCompanyIdAndCompanyLeaseFalseAndDeletedFalseAndIdNot(Long companyId, Long id);

    boolean existsByUserIdAndCompanyIdAndCompanyLeaseFalseAndDeletedFalse(Long userId, Long companyId);

    boolean existsByUserIdAndCompanyIdAndCompanyLeaseFalseAndDeletedFalseAndIdNot(Long userId, Long companyId,
            Long id);

    boolean existsByCompanyIdAndCompanyLeaseTrueAndDeletedFalse(Long companyId);

    boolean existsByUserIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalse(Long userId, Long companyId);
}
