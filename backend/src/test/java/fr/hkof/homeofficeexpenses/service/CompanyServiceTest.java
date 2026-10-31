package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Employee;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.repository.CompanyRepository;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseStatementRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.RentReceiptRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.web.dto.CompanyDtos.CompanyDto;
import fr.hkof.homeofficeexpenses.web.dto.CompanyDtos.CompanyRequest;

class CompanyServiceTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long LEASE_ID = 5L;
    private static final Long USER_ID = 42L;

    private CompanyRepository repository;
    private ExpenseItemRepository expenseItems;
    private ExpenseStatementRepository statements;
    private EmployeeRepository employees;
    private LeaseRepository leases;
    private SignatureRepository signatures;
    private RentReceiptRepository rentReceipts;
    private OwnershipContext ownership;
    private CompanyService service;

    @BeforeEach
    void setUp() {
        repository = mock(CompanyRepository.class);
        expenseItems = mock(ExpenseItemRepository.class);
        statements = mock(ExpenseStatementRepository.class);
        employees = mock(EmployeeRepository.class);
        leases = mock(LeaseRepository.class);
        signatures = mock(SignatureRepository.class);
        rentReceipts = mock(RentReceiptRepository.class);
        ownership = mock(OwnershipContext.class);
        when(ownership.currentUserId()).thenReturn(USER_ID);
        service = new CompanyService(repository, expenseItems, statements, employees, leases, signatures,
                rentReceipts, ownership, Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private Company company() {
        Company company = new Company();
        company.setId(COMPANY_ID);
        company.setName("HKOF");
        company.setLegalForm("EURL");
        company.setSiren("000 000 000");
        company.setAddress("12 rue de la République");
        company.setManagerName("Gérant");
        company.setIssuePlace("Paris");
        company.setDeleted(false);
        return company;
    }

    private Lease lease(Long id, Long companyId) {
        Lease lease = new Lease();
        lease.setId(id);
        lease.setCompanyId(companyId);
        lease.setCompanyLease(true);
        lease.setTotalArea(new java.math.BigDecimal("70.00"));
        lease.setBusinessArea(new java.math.BigDecimal("25.00"));
        lease.setDeleted(false);
        return lease;
    }

    private Lease normalLease(Long id, Long companyId) {
        Lease lease = lease(id, companyId);
        lease.setCompanyLease(false);
        lease.setTotalArea(null);
        lease.setBusinessArea(null);
        return lease;
    }

    private CompanyRequest request(String name, String siren, Long leaseId) {
        return new CompanyRequest(name, "EURL", siren, "12 rue", "Gérant", leaseId, "Paris");
    }

    private void stubSave() {
        when(repository.save(any(Company.class))).thenAnswer(invocation -> {
            Company saved = invocation.getArgument(0);
            saved.setId(COMPANY_ID);
            return saved;
        });
    }

    @Test
    @DisplayName("Listing and mapping expose the linked lease and the pro-rata of that lease")
    void listsAndMaps() {
        when(repository.findAllByUserIdAndDeletedFalseOrderByNameAscIdAsc(USER_ID)).thenReturn(List.of(company()));
        when(repository.findByIdAndUserIdAndDeletedFalse(COMPANY_ID, USER_ID)).thenReturn(Optional.of(company()));
        when(repository.findByIdAndUserId(COMPANY_ID, USER_ID)).thenReturn(Optional.of(company()));
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID))
                .thenReturn(Optional.of(lease(LEASE_ID, COMPANY_ID)));

        List<CompanyDto> list = service.list();

        assertThat(list).hasSize(1);
        assertThat(list.get(0).name()).isEqualTo("HKOF");
        assertThat(list.get(0).leaseId()).isEqualTo(LEASE_ID);
        assertThat(list.get(0).proRataBase()).isEqualTo("35.71");
        assertThat(list.get(0).proRataBaseDetail()).contains("Surface pro 25");
        assertThat(service.get(COMPANY_ID).issuePlace()).isEqualTo("Paris");
        assertThat(service.find(COMPANY_ID)).isPresent();
    }

    @Test
    @DisplayName("A company without lease maps a zero base and an explicit detail")
    void mapsWithoutLease() {
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID)).thenReturn(Optional.empty());

        CompanyDto dto = service.toDto(company());

        assertThat(dto.leaseId()).isNull();
        assertThat(dto.proRataBase()).isEqualTo("0.00");
        assertThat(dto.proRataBaseDetail()).isEqualTo("Surfaces non configurées");
    }

    @Test
    @DisplayName("A linked lease without surfaces maps a zero base")
    void mapsLeaseWithoutSurfaces() {
        Lease lease = lease(LEASE_ID, COMPANY_ID);
        lease.setTotalArea(null);
        lease.setBusinessArea(null);
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID)).thenReturn(Optional.of(lease));

        CompanyDto dto = service.toDto(company());

        assertThat(dto.proRataBase()).isEqualTo("0.00");
        assertThat(dto.proRataBaseDetail()).isEqualTo("Surfaces non configurées");
    }

    @Test
    @DisplayName("Creating a company trims optional values and rejects a duplicate SIREN")
    void createsAndRejectsDuplicateSiren() {
        stubSave();
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID)).thenReturn(Optional.empty());

        CompanyDto created = service.create(request("  HKOF  ", " 123 456 789 ", null));

        assertThat(created.name()).isEqualTo("HKOF");
        assertThat(created.siren()).isEqualTo("123 456 789");

        when(repository.existsByUserIdAndSirenAndDeletedFalse(USER_ID, "123 456 789")).thenReturn(true);
        assertThatThrownBy(() -> service.create(request("Autre", "123 456 789", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Une société avec ce SIREN existe déjà.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("COMPANY_SIREN_DUPLICATE"));
    }

    @Test
    @DisplayName("The onboarding agency exposes its SIRET")
    void exposesSiret() {
        stubSave();
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID))
                .thenReturn(Optional.empty());

        CompanyDto created = service.create(new CompanyRequest("HKOF", "EURL", "123 456 789", "12 rue",
                "Gérant", null, "Paris", " 123 456 789 00012 "));

        assertThat(created.siret()).isEqualTo("123 456 789 00012");
        assertThat(created.siren()).isEqualTo("123 456 789");
    }

    @Test
    @DisplayName("A blank name is rejected in French")
    void rejectsBlankName() {
        assertThatThrownBy(() -> service.create(request("  ", null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom de la société est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("COMPANY_NAME_REQUIRED"));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("Updating a company ignores its own SIREN and rejects another one")
    void updatesSiren() {
        Company existing = company();
        when(repository.findByIdAndUserIdAndDeletedFalse(COMPANY_ID, USER_ID)).thenReturn(Optional.of(existing));
        when(repository.save(any(Company.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID)).thenReturn(Optional.empty());
        when(repository.existsByUserIdAndSirenAndDeletedFalseAndIdNot(USER_ID, "000 000 000", COMPANY_ID)).thenReturn(false);
        when(repository.existsByUserIdAndSirenAndDeletedFalseAndIdNot(USER_ID, "999 999 999", COMPANY_ID)).thenReturn(true);

        assertThat(service.update(COMPANY_ID, request("HKOF 2", "000 000 000", null)).name())
                .isEqualTo("HKOF 2");
        assertThatThrownBy(() -> service.update(COMPANY_ID, request("HKOF 2", "999 999 999", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Une société avec ce SIREN existe déjà.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("COMPANY_SIREN_DUPLICATE"));
    }

    @Test
    @DisplayName("Creating a company with a lease links that lease")
    void linksLeaseOnCreate() {
        stubSave();
        Lease lease = lease(LEASE_ID, null);
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(lease));
        when(leases.findByIdAndUserIdAndDeletedFalse(LEASE_ID, USER_ID)).thenReturn(Optional.of(lease));

        CompanyDto created = service.create(request("HKOF", null, LEASE_ID));

        assertThat(created.leaseId()).isEqualTo(LEASE_ID);
        assertThat(lease.getCompanyId()).isEqualTo(COMPANY_ID);
        verify(leases).save(lease);
    }

    @Test
    @DisplayName("Updating a company unlinks the previous lease and links the selected one")
    void replacesLinkedLease() {
        Company existing = company();
        Lease previous = normalLease(LEASE_ID, COMPANY_ID);
        Lease selected = lease(6L, null);
        when(repository.findByIdAndUserIdAndDeletedFalse(COMPANY_ID, USER_ID)).thenReturn(Optional.of(existing));
        when(repository.save(any(Company.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID)).thenReturn(Optional.of(previous));
        when(leases.findByIdAndUserIdAndDeletedFalse(6L, USER_ID)).thenReturn(Optional.of(selected));

        service.update(COMPANY_ID, request("HKOF", null, 6L));

        assertThat(previous.getCompanyId()).isNull();
        assertThat(selected.getCompanyId()).isEqualTo(COMPANY_ID);
        verify(leases).save(previous);
        verify(leases).save(selected);
    }

    @Test
    @DisplayName("Selecting no lease unlinks the previous one")
    void unlinksWhenNoLeaseSelected() {
        Company existing = company();
        Lease previous = normalLease(LEASE_ID, COMPANY_ID);
        when(repository.findByIdAndUserIdAndDeletedFalse(COMPANY_ID, USER_ID)).thenReturn(Optional.of(existing));
        when(repository.save(any(Company.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID)).thenReturn(Optional.of(previous));

        service.update(COMPANY_ID, request("HKOF", null, null));

        assertThat(previous.getCompanyId()).isNull();
        verify(leases).save(previous);
    }

    @Test
    @DisplayName("An enterprise lease cannot be detached from its tenant company")
    void rejectsUnlinkingCompanyLease() {
        Company existing = company();
        Lease previous = lease(LEASE_ID, COMPANY_ID);
        when(repository.findByIdAndUserIdAndDeletedFalse(COMPANY_ID, USER_ID)).thenReturn(Optional.of(existing));
        when(repository.save(any(Company.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID)).thenReturn(Optional.of(previous));

        assertThatThrownBy(() -> service.update(COMPANY_ID, request("HKOF", null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ce bail est un bail société : la société en est le locataire "
                        + "et ne peut pas être dissociée.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("LEASE_COMPANY_LEASE_LOCKED"));
        assertThat(previous.getCompanyId()).isEqualTo(COMPANY_ID);
        verify(leases, never()).save(previous);
    }

    @Test
    @DisplayName("Switching the active lease to another company lease keeps both and moves the pointer")
    void switchesActiveLeaseBetweenCompanyLeases() {
        Company existing = company();
        Lease previous = lease(LEASE_ID, COMPANY_ID);
        Lease next = lease(6L, COMPANY_ID);
        when(repository.findByIdAndUserIdAndDeletedFalse(COMPANY_ID, USER_ID)).thenReturn(Optional.of(existing));
        when(repository.save(any(Company.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID)).thenReturn(Optional.of(previous));
        when(leases.findByIdAndUserIdAndDeletedFalse(6L, USER_ID)).thenReturn(Optional.of(next));

        CompanyDto updated = service.update(COMPANY_ID, request("HKOF", null, 6L));

        assertThat(updated.leaseId()).isEqualTo(6L);
        assertThat(existing.getActiveLeaseId()).isEqualTo(6L);
        assertThat(previous.getCompanyId()).isEqualTo(COMPANY_ID);
        verify(leases, never()).save(any(Lease.class));
    }

    @Test
    @DisplayName("Re-selecting the active lease persists the pointer without touching the leases")
    void persistsPointerWhenReselectingTheActiveLease() {
        Company existing = company();
        Lease currentLease = lease(LEASE_ID, COMPANY_ID);
        when(repository.findByIdAndUserIdAndDeletedFalse(COMPANY_ID, USER_ID)).thenReturn(Optional.of(existing));
        when(repository.save(any(Company.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID))
                .thenReturn(Optional.of(currentLease));
        when(leases.findByIdAndUserIdAndDeletedFalse(LEASE_ID, USER_ID)).thenReturn(Optional.of(currentLease));

        CompanyDto updated = service.update(COMPANY_ID, request("HKOF", null, LEASE_ID));

        assertThat(updated.leaseId()).isEqualTo(LEASE_ID);
        assertThat(existing.getActiveLeaseId()).isEqualTo(LEASE_ID);
        verify(leases, never()).save(any(Lease.class));
    }

    @Test
    @DisplayName("The DTO and the pro-rata follow the stored active lease, not the lowest id")
    void toDtoPrefersTheStoredActiveLease() {
        Company existing = company();
        existing.setActiveLeaseId(6L);
        Lease newer = lease(6L, COMPANY_ID);
        newer.setTotalArea(new java.math.BigDecimal("60.00"));
        newer.setBusinessArea(new java.math.BigDecimal("30.00"));
        when(leases.findByIdAndUserIdAndDeletedFalse(6L, USER_ID)).thenReturn(Optional.of(newer));

        CompanyDto dto = service.toDto(existing);

        assertThat(dto.leaseId()).isEqualTo(6L);
        assertThat(dto.proRataBase()).isEqualTo("50.00");
    }

    @Test
    @DisplayName("A deleted active lease falls back to the oldest company lease")
    void fallsBackToOldestLeaseWhenActiveLeaseIsGone() {
        Company existing = company();
        existing.setActiveLeaseId(6L);
        when(leases.findByIdAndUserIdAndDeletedFalse(6L, USER_ID)).thenReturn(Optional.empty());
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID))
                .thenReturn(Optional.of(lease(LEASE_ID, COMPANY_ID)));

        CompanyDto dto = service.toDto(existing);

        assertThat(dto.leaseId()).isEqualTo(LEASE_ID);
    }

    @Test
    @DisplayName("An active lease owned by another company is ignored by the fallback")
    void ignoresActiveLeaseOwnedByAnotherCompany() {
        Company existing = company();
        existing.setActiveLeaseId(6L);
        when(leases.findByIdAndUserIdAndDeletedFalse(6L, USER_ID)).thenReturn(Optional.of(lease(6L, 2L)));
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID))
                .thenReturn(Optional.of(lease(LEASE_ID, COMPANY_ID)));

        CompanyDto dto = service.toDto(existing);

        assertThat(dto.leaseId()).isEqualTo(LEASE_ID);
    }

    @Test
    @DisplayName("A lease already linked to another company is rejected in French")
    void rejectsLeaseLinkedToAnotherCompany() {
        Company existing = company();
        Lease foreign = lease(6L, 2L);
        when(repository.findByIdAndUserIdAndDeletedFalse(COMPANY_ID, USER_ID)).thenReturn(Optional.of(existing));
        when(repository.save(any(Company.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID)).thenReturn(Optional.empty());
        when(leases.findByIdAndUserIdAndDeletedFalse(6L, USER_ID)).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> service.update(COMPANY_ID, request("HKOF", null, 6L)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ce bail est déjà lié à une autre société.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LEASE_ALREADY_LINKED"));
        assertThat(foreign.getCompanyId()).isEqualTo(2L);
        verify(leases, never()).save(any(Lease.class));
    }

    @Test
    @DisplayName("An unknown lease is reported in French")
    void rejectsUnknownLease() {
        when(repository.findByIdAndUserIdAndDeletedFalse(COMPANY_ID, USER_ID)).thenReturn(Optional.of(company()));
        when(repository.save(any(Company.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(USER_ID, COMPANY_ID)).thenReturn(Optional.empty());
        when(leases.findByIdAndUserIdAndDeletedFalse(9L, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(COMPANY_ID, request("HKOF", null, 9L)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Bail introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("LEASE_NOT_FOUND"));
    }

    @Test
    @DisplayName("Deleting is blocked only while the company owns items, statements or receipts")
    void deletesLogically() {
        Company managed = company();
        when(repository.findByIdAndUserIdAndDeletedFalse(COMPANY_ID, USER_ID)).thenReturn(Optional.of(managed));

        when(expenseItems.existsByCompanyIdAndDeletedFalse(COMPANY_ID)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(COMPANY_ID)).isInstanceOf(BusinessException.class)
                .hasMessage("Cette société est utilisée par des données et ne peut pas être supprimée.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("COMPANY_IN_USE"));
        when(expenseItems.existsByCompanyIdAndDeletedFalse(COMPANY_ID)).thenReturn(false);

        when(statements.existsByCompanyId(COMPANY_ID)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(COMPANY_ID)).isInstanceOf(BusinessException.class);
        when(statements.existsByCompanyId(COMPANY_ID)).thenReturn(false);

        when(rentReceipts.existsByCompanyId(COMPANY_ID)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(COMPANY_ID)).isInstanceOf(BusinessException.class);
        when(rentReceipts.existsByCompanyId(COMPANY_ID)).thenReturn(false);

        Employee employee = new Employee();
        employee.setId(7L);
        employee.setCompanyId(COMPANY_ID);
        Signature signature = new Signature();
        signature.setId(8L);
        signature.setPersonId(7L);
        Lease linked = lease(LEASE_ID, COMPANY_ID);
        when(employees.findAllByUserIdAndCompanyIdAndDeletedFalseOrderByLastNameAscFirstNameAscIdAsc(USER_ID, COMPANY_ID))
                .thenReturn(List.of(employee));
        when(signatures.findAllByUserIdAndPersonIdInAndDeletedFalse(USER_ID, List.of(7L))).thenReturn(List.of(signature));
        when(leases.findAllByUserIdAndCompanyIdAndDeletedFalse(USER_ID, COMPANY_ID)).thenReturn(List.of(linked));

        service.delete(COMPANY_ID);

        assertThat(managed.isDeleted()).isTrue();
        assertThat(employee.isDeleted()).isTrue();
        assertThat(signature.isDeleted()).isTrue();
        assertThat(linked.getCompanyId()).isNull();
        verify(leases).save(linked);
        verify(employees).saveAll(List.of(employee));
        verify(signatures).saveAll(List.of(signature));
        verify(repository).save(managed);
    }

    @Test
    @DisplayName("A company with no data is deleted without touching unrelated rows")
    void deletesEmptyCompany() {
        Company managed = company();
        when(repository.findByIdAndUserIdAndDeletedFalse(COMPANY_ID, USER_ID)).thenReturn(Optional.of(managed));
        when(employees.findAllByUserIdAndCompanyIdAndDeletedFalseOrderByLastNameAscFirstNameAscIdAsc(USER_ID, COMPANY_ID))
                .thenReturn(List.of());
        when(signatures.findAllByUserIdAndPersonIdInAndDeletedFalse(USER_ID, List.of())).thenReturn(List.of());
        when(leases.findAllByUserIdAndCompanyIdAndDeletedFalse(USER_ID, COMPANY_ID)).thenReturn(List.of());

        service.delete(COMPANY_ID);

        assertThat(managed.isDeleted()).isTrue();
        verify(repository).save(managed);
    }

    @Test
    @DisplayName("A missing selection or company is reported in French")
    void missingCompany() {
        assertThatThrownBy(() -> service.entity(null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Sélectionnez une société.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("COMPANY_REQUIRED"));
        when(repository.findByIdAndUserIdAndDeletedFalse(9L, USER_ID)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.entity(9L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Société introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("COMPANY_NOT_FOUND"));
        assertThatThrownBy(() -> service.get(9L)).isInstanceOf(NotFoundException.class);
    }
}
