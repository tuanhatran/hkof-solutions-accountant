package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Landlord;

public interface LandlordRepository extends JpaRepository<Landlord, Long> {

    List<Landlord> findAllByDeletedFalseOrderByNameAsc();

    Optional<Landlord> findByIdAndDeletedFalse(Long id);

    Optional<Landlord> findFirstByDeletedFalseOrderByNameAsc();
}
