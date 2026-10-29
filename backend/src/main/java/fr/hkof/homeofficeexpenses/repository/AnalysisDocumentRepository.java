package fr.hkof.homeofficeexpenses.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import fr.hkof.homeofficeexpenses.domain.AnalysisDocument;
import fr.hkof.homeofficeexpenses.domain.AnalysisStatus;

public interface AnalysisDocumentRepository extends JpaRepository<AnalysisDocument, Long> {

    @EntityGraph(attributePaths = "receipt")
    List<AnalysisDocument> findByStatusIn(List<AnalysisStatus> statuses);

    @EntityGraph(attributePaths = "receipt")
    java.util.Optional<AnalysisDocument> findFirstByUserIdAndReceiptIdAndStatusInOrderByIdDesc(
            Long userId, Long receiptId, List<AnalysisStatus> statuses);

    @EntityGraph(attributePaths = "receipt")
    @Query("select a from AnalysisDocument a where a.id = :id")
    java.util.Optional<AnalysisDocument> findWithReceiptById(@Param("id") Long id);

    @EntityGraph(attributePaths = "receipt")
    @Query("select a from AnalysisDocument a where a.id = :id and a.userId = :userId")
    java.util.Optional<AnalysisDocument> findWithReceiptByIdAndUserId(
            @Param("id") Long id, @Param("userId") Long userId);
}
