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
import fr.hkof.homeofficeexpenses.domain.EmployeeTitle;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.web.dto.EmployeeDtos.EmployeeDto;
import fr.hkof.homeofficeexpenses.web.dto.EmployeeDtos.EmployeeRequest;

class EmployeeServiceTest {

    private static final Long USER_ID = 42L;

    private EmployeeRepository repository;
    private SignatureRepository signatures;
    private CompanyService companies;
    private OwnershipContext ownership;
    private EmployeeService service;

    @BeforeEach
    void setUp() {
        repository = mock(EmployeeRepository.class);
        signatures = mock(SignatureRepository.class);
        companies = mock(CompanyService.class);
        ownership = mock(OwnershipContext.class);
        when(ownership.currentUserId()).thenReturn(USER_ID);
        service = new EmployeeService(repository, signatures, companies, ownership,
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private Company company(Long id) {
        Company company = new Company();
        company.setId(id);
        company.setName("HKOF");
        return company;
    }

    private Employee employee() {
        Employee employee = new Employee();
        employee.setId(7L);
        employee.setCompanyId(1L);
        employee.setFirstName("Camille");
        employee.setLastName("Martin");
        employee.setEmail("camille@example.fr");
        employee.setTitle(EmployeeTitle.CFO);
        employee.setDeleted(false);
        return employee;
    }

    private EmployeeRequest request(Long companyId, String firstName, String lastName, String email, String title) {
        return new EmployeeRequest(companyId, firstName, lastName, email, null, title, null);
    }

    @Test
    @DisplayName("Listing a company maps its employees")
    void lists() {
        when(companies.entity(1L)).thenReturn(company(1L));
        when(repository.findAllByUserIdAndCompanyIdAndDeletedFalseOrderByLastNameAscFirstNameAscIdAsc(USER_ID, 1L))
                .thenReturn(List.of(employee()));

        List<EmployeeDto> employees = service.list(1L);

        assertThat(employees).hasSize(1);
        assertThat(employees.get(0).lastName()).isEqualTo("Martin");
        assertThat(employees.get(0).title()).isEqualTo("CFO");
    }

    @Test
    @DisplayName("Creating an employee trims values and normalizes the title")
    void creates() {
        when(companies.entity(1L)).thenReturn(company(1L));
        when(repository.save(any(Employee.class))).thenAnswer(invocation -> {
            Employee saved = invocation.getArgument(0);
            saved.setId(7L);
            return saved;
        });

        EmployeeDto dto = service.create(1L, new EmployeeRequest(null, "  Camille ", " Martin ",
                " camille@example.fr ", " 2 rue du Salarié ", "cfo", "  Lyon  "));

        assertThat(dto.id()).isEqualTo(7L);
        assertThat(dto.firstName()).isEqualTo("Camille");
        assertThat(dto.email()).isEqualTo("camille@example.fr");
        assertThat(dto.address()).isEqualTo("2 rue du Salarié");
        assertThat(dto.title()).isEqualTo("CFO");
        assertThat(dto.issuePlace()).isEqualTo("Lyon");
        assertThat(dto.companyId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("The first non-blank CEO issue place is used, ignoring blank places and other titles")
    void ceoIssuePlace() {
        Employee blankCeo = employee();
        blankCeo.setTitle(EmployeeTitle.CEO);
        blankCeo.setIssuePlace("   ");
        Employee cfo = employee();
        cfo.setId(8L);
        cfo.setTitle(EmployeeTitle.CFO);
        cfo.setIssuePlace("Paris");
        Employee ceo = employee();
        ceo.setId(9L);
        ceo.setTitle(EmployeeTitle.CEO);
        ceo.setIssuePlace("  Lyon  ");
        when(repository.findAllByUserIdAndCompanyIdAndDeletedFalseOrderByLastNameAscFirstNameAscIdAsc(USER_ID, 1L))
                .thenReturn(List.of(blankCeo, cfo, ceo));

        assertThat(service.ceoIssuePlace(1L)).contains("Lyon");
        assertThat(service.ceoIssuePlace(null)).isEmpty();
    }

    @Test
    @DisplayName("Required names, a valid email and a known title are enforced in French")
    void rejectsInvalidInputs() {
        when(companies.entity(1L)).thenReturn(company(1L));

        assertThatThrownBy(() -> service.create(1L, request(null, " ", "Martin", null, "CEO")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le prénom du salarié est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("EMPLOYEE_FIRST_NAME_REQUIRED"));
        assertThatThrownBy(() -> service.create(1L, request(null, "Camille", null, null, "CEO")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom du salarié est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("EMPLOYEE_LAST_NAME_REQUIRED"));
        assertThatThrownBy(() -> service.create(1L, request(null, "Camille", "Martin", "pas-un-email", "CEO")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("L'adresse électronique du salarié est invalide.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("EMPLOYEE_EMAIL_INVALID"));
        assertThatThrownBy(() -> service.create(1L, request(null, "Camille", "Martin", null, " ")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("L'intitulé du salarié est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("EMPLOYEE_TITLE_REQUIRED"));
        assertThatThrownBy(() -> service.create(1L, request(null, "Camille", "Martin", null, "PATRON")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Intitulé de salarié invalide")
                .satisfies(ex -> {
                    assertThat(((BusinessException) ex).getCode()).isEqualTo("EMPLOYEE_TITLE_INVALID");
                    assertThat(((BusinessException) ex).getParams()).containsEntry("title", "PATRON");
                });
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("An email is unique inside a company on create and update")
    void rejectsDuplicateEmail() {
        when(companies.entity(1L)).thenReturn(company(1L));
        when(repository.existsByCompanyIdAndEmailIgnoreCaseAndDeletedFalse(1L, "camille@example.fr"))
                .thenReturn(true);
        assertThatThrownBy(() -> service.create(1L,
                request(null, "Camille", "Martin", "camille@example.fr", "CEO")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Un salarié avec cette adresse électronique existe déjà dans la société.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("EMPLOYEE_EMAIL_DUPLICATE"));

        when(repository.findByIdAndUserIdAndDeletedFalse(7L, USER_ID)).thenReturn(Optional.of(employee()));
        when(repository.existsByCompanyIdAndEmailIgnoreCaseAndDeletedFalseAndIdNot(1L, "camille@example.fr", 7L))
                .thenReturn(true);
        assertThatThrownBy(() -> service.update(7L,
                request(null, "Camille", "Martin", "camille@example.fr", "CEO")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Un salarié avec cette adresse électronique existe déjà dans la société.");
    }

    @Test
    @DisplayName("Updating keeps the company unless another one is selected")
    void updates() {
        Employee existing = employee();
        when(repository.findByIdAndUserIdAndDeletedFalse(7L, USER_ID)).thenReturn(Optional.of(existing));
        when(repository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EmployeeDto sameCompany = service.update(7L, request(null, "Camille", "Martin", null, "CFO"));
        assertThat(sameCompany.companyId()).isEqualTo(1L);
        assertThat(sameCompany.title()).isEqualTo("CFO");

        when(companies.entity(2L)).thenReturn(company(2L));
        EmployeeDto moved = service.update(7L, request(2L, "Camille", "Martin", null, "ACCOUNTANT"));
        assertThat(moved.companyId()).isEqualTo(2L);
        assertThat(moved.title()).isEqualTo("ACCOUNTANT");
        verify(companies).entity(2L);
    }

    @Test
    @DisplayName("Deleting is logical and blocked while signatures reference the employee")
    void deletes() {
        Employee existing = employee();
        when(repository.findByIdAndUserIdAndDeletedFalse(7L, USER_ID)).thenReturn(Optional.of(existing));
        when(signatures.existsByPersonIdAndDeletedFalse(7L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(7L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ce salarié porte des signatures et ne peut pas être supprimé.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("EMPLOYEE_HAS_SIGNATURES"));
        verify(repository, never()).save(any());

        when(signatures.existsByPersonIdAndDeletedFalse(7L)).thenReturn(false);
        service.delete(7L);

        assertThat(existing.isDeleted()).isTrue();
        verify(repository).save(existing);
    }

    @Test
    @DisplayName("A missing employee is not found in French")
    void missingEmployee() {
        when(repository.findByIdAndUserIdAndDeletedFalse(9L, USER_ID)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.entity(9L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Salarié introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("EMPLOYEE_NOT_FOUND"));
        assertThatThrownBy(() -> service.update(9L, request(null, "Camille", "Martin", null, "CEO")))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.delete(9L)).isInstanceOf(NotFoundException.class);
    }
}
