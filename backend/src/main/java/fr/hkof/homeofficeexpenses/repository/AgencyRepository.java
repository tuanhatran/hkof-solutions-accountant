package fr.hkof.homeofficeexpenses.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Agency;

public interface AgencyRepository extends JpaRepository<Agency, Long> {

    Optional<Agency> findByUserId(Long userId);
}
