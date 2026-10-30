package fr.hkof.homeofficeexpenses.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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
import org.mockito.ArgumentCaptor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;

import fr.hkof.homeofficeexpenses.domain.Address;
import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Employee;
import fr.hkof.homeofficeexpenses.domain.EmployeeTitle;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.LlmConfig;
import fr.hkof.homeofficeexpenses.domain.Person;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.domain.UserRole;
import fr.hkof.homeofficeexpenses.repository.AddressRepository;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;
import fr.hkof.homeofficeexpenses.repository.CompanyRepository;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.LlmConfigRepository;
import fr.hkof.homeofficeexpenses.repository.PersonRepository;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;

class DataInitializerTest {

    private CompanyRepository companyRepository;
    private EmployeeRepository employeeRepository;
    private PersonRepository personRepository;
    private LeaseRepository leaseRepository;
    private AddressRepository addressRepository;
    private ExpenseItemRepository expenseItemRepository;
    private TemplateDocumentRepository templateRepository;
    private LlmConfigRepository llmConfigRepository;
    private AppUserRepository appUserRepository;
    private PasswordEncoder passwordEncoder;
    private Environment environment;
    private SeedUserInitializer seedUserInitializer;
    private DataInitializer initializer;

    @BeforeEach
    void setUp() {
        companyRepository = mock(CompanyRepository.class);
        employeeRepository = mock(EmployeeRepository.class);
        personRepository = mock(PersonRepository.class);
        leaseRepository = mock(LeaseRepository.class);
        addressRepository = mock(AddressRepository.class);
        expenseItemRepository = mock(ExpenseItemRepository.class);
        templateRepository = mock(TemplateDocumentRepository.class);
        llmConfigRepository = mock(LlmConfigRepository.class);
        appUserRepository = mock(AppUserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        environment = mock(Environment.class);
        AppProperties properties = new AppProperties("data", List.of(),
                new AppProperties.Llm("http://localhost:11434", "qwen2.5vl"));
        when(passwordEncoder.encode(any())).thenAnswer(invocation -> "hash:" + invocation.getArgument(0));
        when(environment.matchesProfiles("e2e")).thenReturn(false);
        AppUser owner = new AppUser();
        owner.setId(1L);
        when(appUserRepository.findByEmailIgnoreCase("thtran@homeofficeexpenses.local"))
                .thenReturn(Optional.of(owner));
        Clock clock = Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC);
        seedUserInitializer = new SeedUserInitializer(appUserRepository, passwordEncoder, environment, clock);
        initializer = new DataInitializer(companyRepository, employeeRepository, personRepository,
                leaseRepository, addressRepository, expenseItemRepository, templateRepository, llmConfigRepository,
                appUserRepository, seedUserInitializer, properties, clock);
    }

    private Company company() {
        Company company = new Company();
        company.setId(1L);
        company.setName("HKOF");
        company.setManagerName("Gérant");
        return company;
    }

    @Test
    @DisplayName("An empty database is seeded with a company, its CEO, a person, a company lease, items, templates and LLM")
    void seedsEmptyDatabase() {
        when(companyRepository.findFirstByUserIdAndDeletedFalseOrderByIdAsc(1L)).thenReturn(Optional.empty());
        when(companyRepository.save(any(Company.class))).thenAnswer(invocation -> {
            Company saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });
        when(employeeRepository.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(1L, 1L)).thenReturn(Optional.empty());
        when(personRepository.findAllNaturalPersons(1L)).thenReturn(List.of());
        when(personRepository.save(any(Person.class))).thenAnswer(invocation -> {
            Person person = invocation.getArgument(0);
            person.setId(1L);
            return person;
        });
        when(leaseRepository.findFirstByUserIdAndDeletedFalseOrderByIdAsc(1L)).thenReturn(Optional.empty());
        when(addressRepository.findFirstByUserIdAndDeletedFalseAndLabelIgnoreCase(1L,
                        "12 rue de la République, 75000 Paris"))
                .thenReturn(Optional.empty());
        when(addressRepository.save(any(Address.class))).thenAnswer(invocation -> {
            Address address = invocation.getArgument(0);
            address.setId(1L);
            return address;
        });
        when(expenseItemRepository.findFirstByUserIdAndCompanyIdAndCode(eq(1L), any(), any())).thenReturn(Optional.empty());
        when(templateRepository.findFirstByUserIdAndTypeAndBuiltInTrueAndDeletedFalse(eq(1L), any())).thenReturn(Optional.empty());
        when(templateRepository.save(any(TemplateDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(templateRepository.findFirstByUserIdAndTypeAndActiveTrueAndDeletedFalse(eq(1L), any())).thenReturn(Optional.empty());
        when(llmConfigRepository.findByUserId(1L)).thenReturn(Optional.empty());
        when(appUserRepository.existsByEmailIgnoreCase(any())).thenReturn(false);

        initializer.run(mock(ApplicationArguments.class));

        ArgumentCaptor<Company> companies = ArgumentCaptor.forClass(Company.class);
        verify(companyRepository).save(companies.capture());
        assertThat(companies.getValue().getName()).isEqualTo("HKOF");
        assertThat(companies.getValue().getLegalForm()).isEqualTo("EURL");

        ArgumentCaptor<Employee> employees = ArgumentCaptor.forClass(Employee.class);
        verify(employeeRepository).save(employees.capture());
        assertThat(employees.getValue().getCompanyId()).isEqualTo(1L);
        assertThat(employees.getValue().getTitle()).isEqualTo(EmployeeTitle.CEO);
        assertThat(employees.getValue().getFirstName()).isEqualTo("Gérant");

        ArgumentCaptor<Address> addresses = ArgumentCaptor.forClass(Address.class);
        verify(addressRepository).save(addresses.capture());
        assertThat(addresses.getValue().getLabel()).isEqualTo("12 rue de la République, 75000 Paris");

        ArgumentCaptor<Lease> leases = ArgumentCaptor.forClass(Lease.class);
        verify(leaseRepository).save(leases.capture());
        assertThat(leases.getValue().getAddress()).isSameAs(addresses.getValue());
        assertThat(leases.getValue().getCompanyId()).isEqualTo(1L);
        assertThat(leases.getValue().isCompanyLease()).isTrue();
        assertThat(leases.getValue().getTenant()).isNull();
        assertThat(leases.getValue().getLandlord().getName()).isEqualTo("Nom du bailleur");
        assertThat(leases.getValue().getLandlord().getUserId()).isEqualTo(1L);
        assertThat(leases.getValue().getTotalArea()).isEqualByComparingTo("70.00");
        assertThat(leases.getValue().getBusinessArea()).isEqualByComparingTo("25.00");
        assertThat(companies.getValue().getHomeAddress()).isNull();
        assertThat(companies.getValue().getTotalArea()).isNull();
        verify(expenseItemRepository, times(6)).save(any());
        ArgumentCaptor<LlmConfig> llmConfigs = ArgumentCaptor.forClass(LlmConfig.class);
        verify(llmConfigRepository).save(llmConfigs.capture());
        assertThat(llmConfigs.getValue().getUserId()).isEqualTo(1L);

        ArgumentCaptor<AppUser> appUsers = ArgumentCaptor.forClass(AppUser.class);
        verify(appUserRepository).save(appUsers.capture());
        assertThat(appUsers.getValue().getEmail()).isEqualTo("thtran@homeofficeexpenses.local");
        assertThat(appUsers.getValue().getPasswordHash()).isEqualTo("hash:thtran");
        assertThat(appUsers.getValue().isConfirmed()).isTrue();
        assertThat(appUsers.getValue().isMustChangePassword()).isTrue();
        assertThat(appUsers.getValue().getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(appUsers.getValue().isCompanyEnabled()).isTrue();
        assertThat(appUsers.getValue().isLmnpEnabled()).isTrue();

        ArgumentCaptor<TemplateDocument> templates = ArgumentCaptor.forClass(TemplateDocument.class);
        verify(templateRepository, times(4)).save(templates.capture());
        assertThat(templates.getAllValues()).extracting(TemplateDocument::getType)
                .contains(TemplateType.RENT_RECEIPT, TemplateType.EXPENSE_STATEMENT);
        assertThat(templates.getAllValues()).anyMatch(TemplateDocument::isActive);
        assertThat(templates.getAllValues()).allMatch(t -> Long.valueOf(1L).equals(t.getUserId()));
    }

    @Test
    @DisplayName("An already seeded database is left untouched")
    void keepsExistingData() {
        when(companyRepository.findFirstByUserIdAndDeletedFalseOrderByIdAsc(1L)).thenReturn(Optional.of(company()));
        when(employeeRepository.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(1L, 1L))
                .thenReturn(Optional.of(new Employee()));
        when(personRepository.findAllNaturalPersons(1L)).thenReturn(List.of(new Person()));
        when(leaseRepository.findFirstByUserIdAndDeletedFalseOrderByIdAsc(1L)).thenReturn(Optional.of(new Lease()));
        when(expenseItemRepository.findFirstByUserIdAndCompanyIdAndCode(eq(1L), eq(1L), any()))
                .thenReturn(Optional.of(new fr.hkof.homeofficeexpenses.domain.ExpenseItem()));
        when(templateRepository.findFirstByUserIdAndTypeAndBuiltInTrueAndDeletedFalse(eq(1L), any()))
                .thenReturn(Optional.of(new TemplateDocument()));
        when(templateRepository.findFirstByUserIdAndTypeAndActiveTrueAndDeletedFalse(eq(1L), any()))
                .thenReturn(Optional.of(new TemplateDocument()));
        when(llmConfigRepository.findByUserId(1L)).thenReturn(Optional.of(new LlmConfig()));
        when(appUserRepository.existsByEmailIgnoreCase(any())).thenReturn(true);

        initializer.run(mock(ApplicationArguments.class));

        verify(companyRepository, never()).save(any());
        verify(employeeRepository, never()).save(any());
        verify(leaseRepository, never()).save(any());
        verify(addressRepository, never()).save(any());
        verify(expenseItemRepository, never()).save(any());
        verify(llmConfigRepository, never()).save(any());
        verify(templateRepository, never()).save(any());
        verify(appUserRepository, never()).save(any());
    }

    @Test
    @DisplayName("The e2e profile seeds its own confirmed account without a forced password change")
    void seedsE2eUserUnderE2eProfile() {
        when(companyRepository.findFirstByUserIdAndDeletedFalseOrderByIdAsc(1L)).thenReturn(Optional.of(company()));
        when(employeeRepository.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(1L, 1L))
                .thenReturn(Optional.of(new Employee()));
        when(personRepository.findAllNaturalPersons(1L)).thenReturn(List.of(new Person()));
        when(leaseRepository.findFirstByUserIdAndDeletedFalseOrderByIdAsc(1L)).thenReturn(Optional.of(new Lease()));
        when(expenseItemRepository.findFirstByUserIdAndCompanyIdAndCode(eq(1L), eq(1L), any()))
                .thenReturn(Optional.of(new fr.hkof.homeofficeexpenses.domain.ExpenseItem()));
        when(templateRepository.findFirstByUserIdAndTypeAndBuiltInTrueAndDeletedFalse(eq(1L), any()))
                .thenReturn(Optional.of(new TemplateDocument()));
        when(templateRepository.findFirstByUserIdAndTypeAndActiveTrueAndDeletedFalse(eq(1L), any()))
                .thenReturn(Optional.of(new TemplateDocument()));
        when(llmConfigRepository.findByUserId(1L)).thenReturn(Optional.of(new LlmConfig()));
        when(appUserRepository.existsByEmailIgnoreCase(any())).thenReturn(false);
        when(environment.matchesProfiles("e2e")).thenReturn(true);

        initializer.run(mock(ApplicationArguments.class));

        ArgumentCaptor<AppUser> appUsers = ArgumentCaptor.forClass(AppUser.class);
        verify(appUserRepository, times(2)).save(appUsers.capture());
        assertThat(appUsers.getAllValues()).extracting(AppUser::getEmail)
                .containsExactly("thtran@homeofficeexpenses.local", "e2e@homeofficeexpenses.local");
        AppUser e2e = appUsers.getAllValues().get(1);
        assertThat(e2e.isConfirmed()).isTrue();
        assertThat(e2e.isMustChangePassword()).isFalse();
        assertThat(e2e.getPasswordHash()).isEqualTo("hash:e2e-password");
    }
}
