package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Lease;

public interface LeaseRepository extends JpaRepository<Lease, Long> {

    List<Lease> findAllByDeletedFalseOrderByIdAsc();

    List<Lease> findAllByCompanyIdAndDeletedFalse(Long companyId);

    Optional<Lease> findFirstByCompanyIdAndDeletedFalseOrderByIdAsc(Long companyId);

    Optional<Lease> findByIdAndDeletedFalse(Long id);

    Optional<Lease> findFirstByLandlordIdAndTenantIdAndDeletedFalse(Long landlordId, Long tenantId);

    Optional<Lease> findFirstByLandlordIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalse(Long landlordId,
            Long companyId);

    Optional<Lease> findFirstByDeletedFalseOrderByIdAsc();

    boolean existsByLandlordIdAndTenantIdAndDeletedFalse(Long landlordId, Long tenantId);

    boolean existsByLandlordIdAndTenantIdAndDeletedFalseAndIdNot(Long landlordId, Long tenantId, Long id);

    boolean existsByLandlordIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalse(Long landlordId, Long companyId);

    boolean existsByLandlordIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalseAndIdNot(Long landlordId, Long companyId,
            Long id);

    boolean existsByLandlordIdAndDeletedFalse(Long landlordId);

    boolean existsByTenantIdAndDeletedFalse(Long tenantId);

    boolean existsByCompanyIdAndCompanyLeaseFalseAndDeletedFalse(Long companyId);

    boolean existsByCompanyIdAndCompanyLeaseFalseAndDeletedFalseAndIdNot(Long companyId, Long id);

    boolean existsByCompanyIdAndCompanyLeaseTrueAndDeletedFalse(Long companyId);
}
