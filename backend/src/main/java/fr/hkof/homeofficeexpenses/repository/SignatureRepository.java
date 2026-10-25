package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Signature;

public interface SignatureRepository extends JpaRepository<Signature, Long> {

    List<Signature> findByPersonIdAndDeletedFalseOrderByNameAscIdAsc(Long personId);

    List<Signature> findAllByPersonIdInAndDeletedFalse(List<Long> personIds);

    Optional<Signature> findFirstByPersonIdAndDeletedFalseOrderByNameAscIdAsc(Long personId);

    long countByPersonIdAndDeletedFalse(Long personId);

    boolean existsByPersonIdAndDeletedFalse(Long personId);
}
