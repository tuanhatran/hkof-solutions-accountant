package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.SignatureType;

public interface SignatureRepository extends JpaRepository<Signature, Long> {

    List<Signature> findByDeletedFalseOrderByTypeAscNameAscIdAsc();

    List<Signature> findByCompanyIdAndDeletedFalse(Long companyId);

    /**
     * Company employee signatures plus the landlord signatures, which are global
     * and therefore visible whatever the active company.
     */
    @Query("""
            select s from Signature s
            where s.deleted = false
              and (s.companyId = :companyId or s.type = :landlordType)
            order by s.type asc, s.name asc, s.id asc
            """)
    List<Signature> findVisibleForCompany(@Param("companyId") Long companyId,
            @Param("landlordType") SignatureType landlordType);

    List<Signature> findByCompanyIdAndEmployeeIdAndDeletedFalseOrderByNameAscIdAsc(Long companyId, Long employeeId);

    Optional<Signature> findFirstByTypeAndDeletedFalseOrderByNameAscIdAsc(SignatureType type);

    Optional<Signature> findFirstByTypeAndDeletedFalseAndLandlordIdOrderByNameAscIdAsc(
            SignatureType type, Long landlordId);

    Optional<Signature> findFirstByTypeAndDeletedFalseAndLandlordIdIsNullOrderByNameAscIdAsc(
            SignatureType type);

    Optional<Signature> findFirstByTypeAndDeletedFalseAndEmployeeIdOrderByNameAscIdAsc(
            SignatureType type, Long employeeId);

    Optional<Signature> findFirstByCompanyIdAndEmployeeIdIsNotNullAndDeletedFalseOrderByIdAsc(Long companyId);

    boolean existsByEmployeeIdAndDeletedFalse(Long employeeId);

    boolean existsByCompanyIdAndDeletedFalse(Long companyId);
}
