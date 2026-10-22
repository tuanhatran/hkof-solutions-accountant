package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import fr.hkof.homeofficeexpenses.domain.NoteFrais;
import fr.hkof.homeofficeexpenses.domain.StatutDocument;

public interface NoteFraisRepository extends JpaRepository<NoteFrais, Long> {

    @EntityGraph(attributePaths = {"lignes", "lignes.poste", "lignes.justificatif"})
    List<NoteFrais> findByMoisOrderByVersionDesc(String mois);

    @EntityGraph(attributePaths = {"lignes", "lignes.poste", "lignes.justificatif"})
    List<NoteFrais> findAllByOrderByMoisDescVersionDesc();

    @EntityGraph(attributePaths = {"lignes", "lignes.poste", "lignes.justificatif"})
    @Query("select n from NoteFrais n where n.id = :id")
    Optional<NoteFrais> findWithLignesById(@Param("id") Long id);

    Optional<NoteFrais> findFirstByMoisOrderByVersionDesc(String mois);

    Optional<NoteFrais> findFirstByMoisAndStatutOrderByVersionDesc(String mois, StatutDocument statut);
}
