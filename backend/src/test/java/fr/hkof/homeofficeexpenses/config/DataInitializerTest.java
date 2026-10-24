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

import fr.hkof.homeofficeexpenses.domain.Address;
import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Employee;
import fr.hkof.homeofficeexpenses.domain.EmployeeTitle;
import fr.hkof.homeofficeexpenses.domain.Landlord;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.domain.Tenant;
import fr.hkof.homeofficeexpenses.repository.AddressRepository;
import fr.hkof.homeofficeexpenses.repository.CompanyRepository;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.repository.LandlordRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.LlmConfigRepository;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;
import fr.hkof.homeofficeexpenses.repository.TenantRepository;

class DataInitializerTest {

    private CompanyRepository companyRepository;
    private EmployeeRepository employeeRepository;
    private LandlordRepository landlordRepository;
    private TenantRepository tenantRepository;
    private LeaseRepository leaseRepository;
    private AddressRepository addressRepository;
    private ExpenseItemRepository expenseItemRepository;
    private TemplateDocumentRepository templateRepository;
    private LlmConfigRepository llmConfigRepository;
    private DataInitializer initializer;

    @BeforeEach
    void setUp() {
        companyRepository = mock(CompanyRepository.class);
        employeeRepository = mock(EmployeeRepository.class);
        landlordRepository = mock(LandlordRepository.class);
        tenantRepository = mock(TenantRepository.class);
        leaseRepository = mock(LeaseRepository.class);
        addressRepository = mock(AddressRepository.class);
        expenseItemRepository = mock(ExpenseItemRepository.class);
        templateRepository = mock(TemplateDocumentRepository.class);
        llmConfigRepository = mock(LlmConfigRepository.class);
        AppProperties properties = new AppProperties("data", List.of(),
                new AppProperties.Llm("http://localhost:11434", "qwen2.5vl"));
        initializer = new DataInitializer(companyRepository, employeeRepository, landlordRepository, tenantRepository,
                leaseRepository, addressRepository, expenseItemRepository, templateRepository, llmConfigRepository,
                properties, Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private Company company() {
        Company company = new Company();
        company.setId(1L);
        company.setName("HKOF");
        company.setManagerName("Gérant");
        return company;
    }

    @Test
    @DisplayName("An empty database is seeded with a company, its CEO, rent configuration, items, templates and LLM")
    void seedsEmptyDatabase() {
        when(companyRepository.findFirstByDeletedFalseOrderByIdAsc()).thenReturn(Optional.empty());
        when(companyRepository.save(any(Company.class))).thenAnswer(invocation -> {
            Company saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });
        when(employeeRepository.findFirstByCompanyIdAndDeletedFalseOrderByIdAsc(1L)).thenReturn(Optional.empty());
        when(landlordRepository.findFirstByDeletedFalseOrderByNameAsc()).thenReturn(Optional.empty());
        when(landlordRepository.save(any(Landlord.class))).thenAnswer(invocation -> {
            Landlord landlord = invocation.getArgument(0);
            landlord.setId(1L);
            return landlord;
        });
        when(tenantRepository.findFirstByDeletedFalseOrderByNameAsc()).thenReturn(Optional.empty());
        when(tenantRepository.save(any(Tenant.class))).thenAnswer(invocation -> {
            Tenant tenant = invocation.getArgument(0);
            tenant.setId(1L);
            return tenant;
        });
        when(leaseRepository.findFirstByDeletedFalseOrderByIdAsc()).thenReturn(Optional.empty());
        when(addressRepository.findFirstByDeletedFalseAndLabelIgnoreCase("12 rue de la République, 75000 Paris"))
                .thenReturn(Optional.empty());
        when(addressRepository.save(any(Address.class))).thenAnswer(invocation -> {
            Address address = invocation.getArgument(0);
            address.setId(1L);
            return address;
        });
        when(expenseItemRepository.findFirstByCompanyIdAndCode(any(), any())).thenReturn(Optional.empty());
        when(templateRepository.findFirstByTypeAndBuiltInTrueAndDeletedFalse(any())).thenReturn(Optional.empty());
        when(templateRepository.save(any(TemplateDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(templateRepository.findFirstByTypeAndActiveTrueAndDeletedFalse(any())).thenReturn(Optional.empty());
        when(llmConfigRepository.existsById(1L)).thenReturn(false);

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
        assertThat(leases.getValue().getTotalArea()).isEqualByComparingTo("70.00");
        assertThat(leases.getValue().getBusinessArea()).isEqualByComparingTo("25.00");
        assertThat(companies.getValue().getHomeAddress()).isNull();
        assertThat(companies.getValue().getTotalArea()).isNull();
        verify(expenseItemRepository, times(6)).save(any());
        verify(llmConfigRepository).save(any());

        ArgumentCaptor<TemplateDocument> templates = ArgumentCaptor.forClass(TemplateDocument.class);
        verify(templateRepository, times(4)).save(templates.capture());
        assertThat(templates.getAllValues()).extracting(TemplateDocument::getType)
                .contains(TemplateType.RENT_RECEIPT, TemplateType.EXPENSE_STATEMENT);
        assertThat(templates.getAllValues()).anyMatch(TemplateDocument::isActive);
    }

    @Test
    @DisplayName("An already seeded database is left untouched")
    void keepsExistingData() {
        when(companyRepository.findFirstByDeletedFalseOrderByIdAsc()).thenReturn(Optional.of(company()));
        when(employeeRepository.findFirstByCompanyIdAndDeletedFalseOrderByIdAsc(1L))
                .thenReturn(Optional.of(new Employee()));
        when(landlordRepository.findFirstByDeletedFalseOrderByNameAsc()).thenReturn(Optional.of(new Landlord()));
        when(tenantRepository.findFirstByDeletedFalseOrderByNameAsc()).thenReturn(Optional.of(new Tenant()));
        when(leaseRepository.findFirstByDeletedFalseOrderByIdAsc()).thenReturn(Optional.of(new Lease()));
        when(expenseItemRepository.findFirstByCompanyIdAndCode(eq(1L), any()))
                .thenReturn(Optional.of(new fr.hkof.homeofficeexpenses.domain.ExpenseItem()));
        when(templateRepository.findFirstByTypeAndBuiltInTrueAndDeletedFalse(any()))
                .thenReturn(Optional.of(new TemplateDocument()));
        when(templateRepository.findFirstByTypeAndActiveTrueAndDeletedFalse(any()))
                .thenReturn(Optional.of(new TemplateDocument()));
        when(llmConfigRepository.existsById(1L)).thenReturn(true);

        initializer.run(mock(ApplicationArguments.class));

        verify(companyRepository, never()).save(any());
        verify(employeeRepository, never()).save(any());
        verify(leaseRepository, never()).save(any());
        verify(addressRepository, never()).save(any());
        verify(expenseItemRepository, never()).save(any());
        verify(llmConfigRepository, never()).save(any());
        verify(templateRepository, never()).save(any());
    }
}
