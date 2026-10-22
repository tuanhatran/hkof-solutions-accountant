package fr.hkof.homeofficeexpenses.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import fr.hkof.homeofficeexpenses.domain.AnalyseDocument;
import fr.hkof.homeofficeexpenses.domain.StatutAnalyse;

public interface AnalyseDocumentRepository extends JpaRepository<AnalyseDocument, Long> {

    @EntityGraph(attributePaths = "justificatif")
    List<AnalyseDocument> findByStatutIn(List<StatutAnalyse> statuts);

    @EntityGraph(attributePaths = "justificatif")
    java.util.Optional<AnalyseDocument> findFirstByJustificatifIdAndStatutInOrderByIdDesc(Long justificatifId,
            List<StatutAnalyse> statuts);

    @EntityGraph(attributePaths = "justificatif")
    @Query("select a from AnalyseDocument a where a.id = :id")
    java.util.Optional<AnalyseDocument> findWithJustificatifById(@Param("id") Long id);
}
