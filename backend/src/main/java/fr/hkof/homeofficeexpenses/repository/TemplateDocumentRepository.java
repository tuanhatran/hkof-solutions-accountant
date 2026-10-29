package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateType;

public interface TemplateDocumentRepository extends JpaRepository<TemplateDocument, Long> {

    List<TemplateDocument> findByUserIdAndTypeAndDeletedFalseOrderByVersionDesc(Long userId, TemplateType type);

    List<TemplateDocument> findByUserIdAndTypeAndActiveTrueAndDeletedFalse(Long userId, TemplateType type);

    Optional<TemplateDocument> findFirstByUserIdAndTypeAndActiveTrueAndDeletedFalse(Long userId, TemplateType type);

    Optional<TemplateDocument> findFirstByUserIdAndTypeAndBuiltInTrueAndDeletedFalse(Long userId, TemplateType type);

    Optional<TemplateDocument> findTopByUserIdAndTypeOrderByVersionDesc(Long userId, TemplateType type);

    Optional<TemplateDocument> findByIdAndUserId(Long id, Long userId);

    List<TemplateDocument> findByTypeAndDeletedFalseOrderByVersionDesc(TemplateType type);

    List<TemplateDocument> findByTypeAndActiveTrueAndDeletedFalse(TemplateType type);

    Optional<TemplateDocument> findFirstByTypeAndActiveTrueAndDeletedFalse(TemplateType type);

    Optional<TemplateDocument> findFirstByTypeAndBuiltInTrueAndDeletedFalse(TemplateType type);

    Optional<TemplateDocument> findTopByTypeOrderByVersionDesc(TemplateType type);
}
