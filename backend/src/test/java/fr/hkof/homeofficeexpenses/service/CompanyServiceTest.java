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

    private CompanyRepository repository;
    private ExpenseItemRepository expenseItems;
    private ExpenseStatementRepository statements;
    private EmployeeRepository employees;
    private LeaseRepository leases;
    private SignatureRepository signatures;
    private RentReceiptRepository rentReceipts;
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
        service = new CompanyService(repository, expenseItems, statements, employees, leases, signatures,
                rentReceipts, Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private Company company() {
        Company company = new Company();
        company.setId(1L);
        company.setName("HKOF");
        company.setLegalForm("EURL");
        company.setSiren("000 000 000");
        company.setAddress("12 rue de la République");
        company.setManagerName("Gérant");
        company.setHomeAddress("12 rue de la République");
        company.setTotalArea(new java.math.BigDecimal("70.00"));
        company.setBusinessArea(new java.math.BigDecimal("25.00"));
        company.setIssuePlace("Paris");
        company.setDeleted(false);
        return company;
    }

    private CompanyRequest request(String name, String siren) {
        return new CompanyRequest(name, "EURL", siren, "12 rue", "Gérant", "12 rue", "70", "25", "Paris");
    }

    @Test
    @DisplayName("Listing and mapping expose the pro-rata base and its detail")
    void listsAndMaps() {
        when(repository.findAllByDeletedFalseOrderByNameAscIdAsc()).thenReturn(List.of(company()));
        when(repository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(company()));
        when(repository.findById(1L)).thenReturn(Optional.of(company()));

        List<CompanyDto> list = service.list();
        assertThat(list).hasSize(1);
        assertThat(list.get(0).name()).isEqualTo("HKOF");
        assertThat(list.get(0).proRataBase()).isEqualTo("35.71");
        assertThat(list.get(0).proRataBaseDetail()).contains("Surface pro 25");
        assertThat(service.get(1L).issuePlace()).isEqualTo("Paris");
        assertThat(service.find(1L)).isPresent();
    }

    @Test
    @DisplayName("A company without surfaces maps a zero base and an explicit detail")
    void mapsWithoutSurfaces() {
        Company company = company();
        company.setTotalArea(null);
        company.setBusinessArea(null);

        CompanyDto dto = service.toDto(company);

        assertThat(dto.proRataBase()).isEqualTo("0.00");
        assertThat(dto.proRataBaseDetail()).isEqualTo("Surfaces non configurées");
    }

    @Test
    @DisplayName("Creating a company trims optional values and rejects a duplicate SIREN")
    void createsAndRejectsDuplicateSiren() {
        when(repository.save(any(Company.class))).thenAnswer(invocation -> {
            Company saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        CompanyDto created = service.create(request("  HKOF  ", " 123 456 789 "));

        assertThat(created.name()).isEqualTo("HKOF");
        assertThat(created.siren()).isEqualTo("123 456 789");

        when(repository.existsBySirenAndDeletedFalse("123 456 789")).thenReturn(true);
        assertThatThrownBy(() -> service.create(request("Autre", "123 456 789")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Une société avec ce SIREN existe déjà.");
    }

    @Test
    @DisplayName("A blank name and an invalid surface are rejected in French")
    void rejectsInvalidInputs() {
        assertThatThrownBy(() -> service.create(request("  ", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom de la société est obligatoire.");
        assertThatThrownBy(() -> service.create(
                new CompanyRequest("HKOF", null, null, null, null, null, "70", "80", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La surface professionnelle doit être comprise entre 0 et la surface totale.");
        assertThatThrownBy(() -> service.create(
                new CompanyRequest("HKOF", null, null, null, null, null, "-1", null, null)))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.create(
                new CompanyRequest("HKOF", null, null, null, null, null, "abc", null, null)))
                .isInstanceOf(BusinessException.class);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("Updating a company ignores its own SIREN and rejects another one")
    void updatesSiren() {
        Company existing = company();
        when(repository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(existing));
        when(repository.save(any(Company.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.existsBySirenAndDeletedFalseAndIdNot("000 000 000", 1L)).thenReturn(false);
        when(repository.existsBySirenAndDeletedFalseAndIdNot("999 999 999", 1L)).thenReturn(true);

        assertThat(service.update(1L, request("HKOF 2", "000 000 000")).name()).isEqualTo("HKOF 2");
        assertThatThrownBy(() -> service.update(1L, request("HKOF 2", "999 999 999")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Une société avec ce SIREN existe déjà.");
    }

    @Test
    @DisplayName("Deleting is logical and blocked while the company owns data")
    void deletesLogically() {
        Company managed = company();
        when(repository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(managed));

        when(expenseItems.existsByCompanyIdAndDeletedFalse(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L)).isInstanceOf(BusinessException.class)
                .hasMessage("Cette société est utilisée par des données et ne peut pas être supprimée.");
        when(expenseItems.existsByCompanyIdAndDeletedFalse(1L)).thenReturn(false);

        when(statements.existsByCompanyId(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L)).isInstanceOf(BusinessException.class);
        when(statements.existsByCompanyId(1L)).thenReturn(false);

        when(employees.existsByCompanyIdAndDeletedFalse(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L)).isInstanceOf(BusinessException.class);
        when(employees.existsByCompanyIdAndDeletedFalse(1L)).thenReturn(false);

        when(leases.existsByCompanyIdAndDeletedFalse(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L)).isInstanceOf(BusinessException.class);
        when(leases.existsByCompanyIdAndDeletedFalse(1L)).thenReturn(false);

        when(signatures.existsByCompanyIdAndDeletedFalse(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L)).isInstanceOf(BusinessException.class);
        when(signatures.existsByCompanyIdAndDeletedFalse(1L)).thenReturn(false);

        when(rentReceipts.existsByCompanyId(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L)).isInstanceOf(BusinessException.class);
        when(rentReceipts.existsByCompanyId(1L)).thenReturn(false);

        service.delete(1L);

        assertThat(managed.isDeleted()).isTrue();
        verify(repository).save(managed);
    }

    @Test
    @DisplayName("A missing selection or company is reported in French")
    void missingCompany() {
        assertThatThrownBy(() -> service.entity(null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Sélectionnez une société.");
        when(repository.findByIdAndDeletedFalse(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.entity(9L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Société introuvable.");
        assertThatThrownBy(() -> service.get(9L)).isInstanceOf(NotFoundException.class);
    }
}
