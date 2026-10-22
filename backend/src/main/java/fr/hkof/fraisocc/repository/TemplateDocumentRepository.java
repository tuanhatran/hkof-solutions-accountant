package fr.hkof.fraisocc.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.fraisocc.domain.TemplateDocument;
import fr.hkof.fraisocc.domain.TypeTemplate;

public interface TemplateDocumentRepository extends JpaRepository<TemplateDocument, Long> {

    List<TemplateDocument> findByTypeAndSupprimeFalseOrderByVersionDesc(TypeTemplate type);

    List<TemplateDocument> findByTypeAndActifTrueAndSupprimeFalse(TypeTemplate type);

    Optional<TemplateDocument> findFirstByTypeAndActifTrueAndSupprimeFalse(TypeTemplate type);

    Optional<TemplateDocument> findFirstByTypeAndIntegreTrueAndSupprimeFalse(TypeTemplate type);

    Optional<TemplateDocument> findTopByTypeOrderByVersionDesc(TypeTemplate type);
}
