package fr.hkof.homeofficeexpenses.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.DocumentDraft;

public interface DocumentDraftRepository extends JpaRepository<DocumentDraft, Long> {

    Optional<DocumentDraft> findByIdAndUserIdAndDeletedFalse(Long id, Long userId);

    Optional<DocumentDraft> findFirstByUserIdAndTypeAndMonthAndLandlordIdAndTenantIdAndDeletedFalseOrderByIdDesc(
            Long userId, DocumentDraft.Type type, String month, Long landlordId, Long tenantId);

    Optional<DocumentDraft> findFirstByUserIdAndTypeAndMonthAndLandlordIdAndTenantCompanyIdAndDeletedFalseOrderByIdDesc(
            Long userId, DocumentDraft.Type type, String month, Long landlordId, Long tenantCompanyId);

    Optional<DocumentDraft> findFirstByUserIdAndTypeAndMonthAndCompanyIdAndLeaseIdAndDeletedFalseOrderByIdDesc(
            Long userId, DocumentDraft.Type type, String month, Long companyId, Long leaseId);

    Optional<DocumentDraft> findFirstByUserIdAndTypeAndMonthAndCompanyIdAndLeaseIdIsNullAndDeletedFalseOrderByIdDesc(
            Long userId, DocumentDraft.Type type, String month, Long companyId);
}
