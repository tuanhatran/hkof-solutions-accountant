package fr.hkof.fraisocc.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.fraisocc.domain.Quittance;
import fr.hkof.fraisocc.domain.StatutDocument;

public interface QuittanceRepository extends JpaRepository<Quittance, Long> {

    List<Quittance> findByMoisOrderByVersionDesc(String mois);

    List<Quittance> findAllByOrderByMoisDescVersionDesc();

    Optional<Quittance> findFirstByMoisAndStatutOrderByVersionDesc(String mois, StatutDocument statut);

    Optional<Quittance> findFirstByMoisOrderByVersionDesc(String mois);
}
