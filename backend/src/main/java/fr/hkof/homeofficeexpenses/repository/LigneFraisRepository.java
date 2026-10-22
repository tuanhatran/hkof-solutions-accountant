package fr.hkof.homeofficeexpenses.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.LigneFrais;

public interface LigneFraisRepository extends JpaRepository<LigneFrais, Long> {

    boolean existsByJustificatifId(Long justificatifId);
}
