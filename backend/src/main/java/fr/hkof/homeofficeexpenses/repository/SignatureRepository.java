package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.SignatureType;

public interface SignatureRepository extends JpaRepository<Signature, Long> {

    List<Signature> findByDeletedFalseOrderByTypeAscNameAscIdAsc();

    Optional<Signature> findFirstByTypeAndDeletedFalseOrderByNameAscIdAsc(SignatureType type);

    Optional<Signature> findFirstByTypeAndDeletedFalseAndLandlordIdOrderByNameAscIdAsc(
            SignatureType type, Long landlordId);

    Optional<Signature> findFirstByTypeAndDeletedFalseAndLandlordIdIsNullOrderByNameAscIdAsc(
            SignatureType type);
}
