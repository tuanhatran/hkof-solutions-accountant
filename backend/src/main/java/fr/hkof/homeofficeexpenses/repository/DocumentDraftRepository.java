package fr.hkof.homeofficeexpenses.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.DocumentDraft;

public interface DocumentDraftRepository extends JpaRepository<DocumentDraft, Long> {

    Optional<DocumentDraft> findFirstByTypeAndMonthAndLandlordIdAndTenantIdAndDeletedFalseOrderByIdDesc(
            DocumentDraft.Type type, String month, Long landlordId, Long tenantId);

    Optional<DocumentDraft> findFirstByTypeAndMonthAndLandlordIdAndTenantCompanyIdAndDeletedFalseOrderByIdDesc(
            DocumentDraft.Type type, String month, Long landlordId, Long tenantCompanyId);

    Optional<DocumentDraft> findFirstByTypeAndMonthAndCompanyIdAndDeletedFalseOrderByIdDesc(
            DocumentDraft.Type type, String month, Long companyId);
}
