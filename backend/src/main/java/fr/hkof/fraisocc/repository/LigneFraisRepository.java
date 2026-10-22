package fr.hkof.fraisocc.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.fraisocc.domain.LigneFrais;

public interface LigneFraisRepository extends JpaRepository<LigneFrais, Long> {

    boolean existsByJustificatifId(Long justificatifId);
}
