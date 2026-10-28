package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.Address;
import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.Person;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.PersonRepository;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LeaseDto;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LeaseRequest;

class LeaseServiceTest {

    private PersonRepository persons;
    private EmployeeRepository employees;
    private LeaseRepository leases;
    private CompanyService companies;
    private AddressService addresses;
    private LeaseService service;

    @BeforeEach
    void setUp() {
        persons = mock(PersonRepository.class);
        employees = mock(EmployeeRepository.class);
        leases = mock(LeaseRepository.class);
        companies = mock(CompanyService.class);
        addresses = mock(AddressService.class);
        when(addresses.findOrCreate(anyString())).thenAnswer(invocation -> address(4L, invocation.getArgument(0)));
        service = new LeaseService(persons, employees, leases, companies, addresses,
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private Person person(Long id, String name) {
        Person person = new Person();
        person.setId(id);
        person.setName(name);
        person.setAddress("Adresse " + name);
        return person;
    }

    private Company company(Long id, String name) {
        Company company = new Company();
        company.setId(id);
        company.setName(name);
        return company;
    }

    private Address address(Long id, String label) {
        Address address = new Address();
        address.setId(id);
        address.setLabel(label);
        return address;
    }

    private Lease normalLease() {
        Lease lease = new Lease();
        lease.setId(3L);
        lease.setLandlord(person(1L, "Bailleur"));
        lease.setTenant(person(2L, "Locataire"));
        lease.setAddress(address(4L, "12 rue de la République"));
        lease.setRentExclCharges(new BigDecimal("900.00"));
        lease.setCharges(new BigDecimal("50.00"));
        return lease;
    }

    private Lease companyLease() {
        Lease lease = new Lease();
        lease.setId(5L);
        lease.setLandlord(person(1L, "Bailleur"));
        lease.setAddress(address(4L, "12 rue de la République"));
        lease.setCompanyId(7L);
        lease.setCompanyLease(true);
        lease.setTotalArea(new BigDecimal("70.00"));
        lease.setBusinessArea(new BigDecimal("25.00"));
        lease.setRentExclCharges(new BigDecimal("900.00"));
        lease.setCharges(new BigDecimal("0.00"));
        return lease;
    }

    @Test
    @DisplayName("Leases map the normal tenant and the enterprise tenant company")
    void listsLeases() {
        Lease normal = normalLease();
        normal.setCompanyId(9L);
        when(leases.findAllByDeletedFalseOrderByIdAsc()).thenReturn(List.of(normal, companyLease()));
        when(companies.find(7L)).thenReturn(Optional.of(company(7L, "Société locataire")));
        when(companies.find(9L)).thenReturn(Optional.of(company(9L, "Société pro-rata")));

        List<LeaseDto> result = service.listLeases();

        assertThat(result).extracting(LeaseDto::propertyAddress)
                .containsExactly("12 rue de la République", "12 rue de la République");
        assertThat(result.get(0).tenantName()).isEqualTo("Locataire");
        assertThat(result.get(0).companyName()).isEqualTo("Société pro-rata");
        assertThat(result.get(1).tenantId()).isNull();
        assertThat(result.get(1).tenantName()).isEqualTo("Société locataire");
        assertThat(result.get(1).companyId()).isEqualTo(7L);
        assertThat(result.get(0).proRataBase()).isNull();
        assertThat(result.get(0).proRataBaseDetail()).isNull();
        assertThat(result.get(1).proRataBase()).isEqualTo("35.71");
        assertThat(result.get(1).proRataBaseDetail())
                .isEqualTo("Surface pro 25,00 m² / 70,00 m² = 35,71\u00A0%");
    }

    @Test
    @DisplayName("The expense lease resolves the requested or the first active lease")
    void resolvesExpenseLease() {
        when(leases.findFirstByCompanyIdAndDeletedFalseOrderByIdAsc(7L))
                .thenReturn(Optional.of(companyLease()));
        assertThat(service.resolveExpenseLease(7L, null).getId()).isEqualTo(5L);
        when(leases.findByIdAndDeletedFalse(5L)).thenReturn(Optional.of(companyLease()));
        assertThat(service.resolveExpenseLease(7L, 5L).getId()).isEqualTo(5L);

        when(leases.findFirstByCompanyIdAndDeletedFalseOrderByIdAsc(8L)).thenReturn(Optional.empty());
        assertThat(service.resolveExpenseLease(8L, null)).isNull();

        when(leases.findByIdAndDeletedFalse(6L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.resolveExpenseLease(7L, 6L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Bail introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("LEASE_NOT_FOUND"));

        Lease foreign = companyLease();
        foreign.setId(6L);
        when(leases.findByIdAndDeletedFalse(6L)).thenReturn(Optional.of(foreign));
        assertThatThrownBy(() -> service.resolveExpenseLease(9L, 6L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ce bail n'appartient pas à la société.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LEASE_NOT_IN_COMPANY"));
    }

    @Test
    @DisplayName("The lease pro-rata is computed by CalculationService with scale 2")
    void computesLeaseProRata() {
        when(leases.findFirstByCompanyIdAndDeletedFalseOrderByIdAsc(7L))
                .thenReturn(Optional.of(companyLease()));
        LeaseService.ProRata proRata = service.proRata(7L, null);
        assertThat(proRata.base()).isEqualByComparingTo("35.71");
        assertThat(proRata.detail()).isEqualTo("Surface pro 25,00 m² / 70,00 m² = 35,71\u00A0%");

        when(leases.findFirstByCompanyIdAndDeletedFalseOrderByIdAsc(8L)).thenReturn(Optional.empty());
        LeaseService.ProRata withoutLease = service.proRata(8L, null);
        assertThat(withoutLease.base()).isEqualByComparingTo("0.00");
        assertThat(withoutLease.detail()).isEqualTo("Surfaces non configurées");
    }

    @Test
    @DisplayName("The rent receipt scope pairs the landlord with the tenant company or the tenant person")
    void rentReceiptScope() {
        assertThat(LeaseService.rentReceiptScope(companyLease()))
                .isEqualTo(new LeaseService.RentReceiptScope(1L, null, 7L));
        assertThat(LeaseService.rentReceiptScope(normalLease()))
                .isEqualTo(new LeaseService.RentReceiptScope(1L, 2L, null));
        assertThat(LeaseService.rentReceiptScope(null)).isNull();
    }

    @Test
    @DisplayName("A normal lease can be created, updated and logically deleted")
    void normalLeaseCrud() {
        when(persons.findNaturalPersonById(1L)).thenReturn(Optional.of(person(1L, "Bailleur")));
        when(persons.findNaturalPersonById(2L)).thenReturn(Optional.of(person(2L, "Locataire")));
        when(leases.save(any(Lease.class))).thenAnswer(invocation -> {
            Lease saved = invocation.getArgument(0);
            saved.setId(3L);
            return saved;
        });

        LeaseDto created = service.createLease(
                new LeaseRequest(false, 1L, null, 2L, "12 rue", "900", null, null, null));
        assertThat(created.addressId()).isEqualTo(4L);
        assertThat(created.rentExclCharges()).isEqualTo("900.00");
        assertThat(created.charges()).isEqualTo("0.00");
        assertThat(created.companyLease()).isFalse();
        assertThat(created.tenantName()).isEqualTo("Locataire");

        Lease existing = normalLease();
        existing.setCompanyId(9L);
        when(leases.findByIdAndDeletedFalse(3L)).thenReturn(Optional.of(existing));
        LeaseDto updated = service.updateLease(3L,
                new LeaseRequest(false, 1L, null, 2L, "13 rue", "950", "60", "80", "20"));
        assertThat(updated.propertyAddress()).isEqualTo("13 rue");
        assertThat(existing.getCompanyId()).isEqualTo(9L);
        assertThat(existing.getTotalArea()).isNull();
        assertThat(existing.getBusinessArea()).isNull();

        service.deleteLease(3L);
        assertThat(existing.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("A company lease stores the company tenant and requires both surfaces")
    void companyLeaseCrud() {
        when(persons.findNaturalPersonById(1L)).thenReturn(Optional.of(person(1L, "Bailleur")));
        when(companies.entity(7L)).thenReturn(company(7L, "Société locataire"));
        when(leases.save(any(Lease.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(companies.find(7L)).thenReturn(Optional.of(company(7L, "Société locataire")));

        LeaseDto created = service.createLease(
                new LeaseRequest(true, 1L, 7L, null, "12 rue", "900", null, "70", "25"));
        assertThat(created.companyLease()).isTrue();
        assertThat(created.companyId()).isEqualTo(7L);
        assertThat(created.tenantId()).isNull();
        assertThat(created.tenantName()).isEqualTo("Société locataire");
        assertThat(created.totalArea()).isEqualTo("70.00");
        assertThat(created.businessArea()).isEqualTo("25.00");

        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(true, 1L, 7L, null, "12 rue", "900", null, null, "25")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Les surfaces sont obligatoires pour un bail société.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LEASE_SURFACES_REQUIRED"));
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(true, 1L, 7L, null, "12 rue", "900", null, "70", "80")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La surface professionnelle doit être comprise entre 0 et la surface totale.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("PRO_RATA_BUSINESS_AREA_OUT_OF_RANGE"));
    }

    @Test
    @DisplayName("Employees can never be lease parties")
    void employeesRejected() {
        when(employees.existsByIdAndDeletedFalse(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, 1L, null, 2L, "12 rue", "900", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Un salarié ne peut pas être partie à un bail.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LEASE_EMPLOYEE_PARTY"));

        when(employees.existsByIdAndDeletedFalse(1L)).thenReturn(false);
        when(persons.findNaturalPersonById(1L)).thenReturn(Optional.of(person(1L, "Bailleur")));
        when(employees.existsByIdAndDeletedFalse(2L)).thenReturn(true);
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, 1L, null, 2L, "12 rue", "900", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Un salarié ne peut pas être partie à un bail.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LEASE_EMPLOYEE_PARTY"));
    }

    @Test
    @DisplayName("The same person cannot be landlord and tenant")
    void samePersonRejected() {
        when(persons.findNaturalPersonById(1L)).thenReturn(Optional.of(person(1L, "Bailleur")));
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, 1L, null, 1L, "12 rue", "900", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le bailleur et le locataire doivent être deux personnes distinctes.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LEASE_PARTIES_IDENTICAL"));
    }

    @Test
    @DisplayName("Lease validation rejects missing parties, missing entities and blank addresses")
    void leaseValidation() {
        when(persons.findNaturalPersonById(1L)).thenReturn(Optional.of(person(1L, "Bailleur")));
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, null, null, 2L, "12 rue", "900", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Sélectionnez un bailleur.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LEASE_LANDLORD_REQUIRED"));
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, 1L, null, null, "12 rue", "900", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Sélectionnez un locataire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LEASE_TENANT_REQUIRED"));
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(true, 1L, null, null, "12 rue", "900", null, "70", "25")))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("LEASE_TENANT_COMPANY_REQUIRED"));
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(true, 1L, 7L, 2L, "12 rue", "900", null, "70", "25")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Un bail société ne comporte pas de locataire personne physique.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("LEASE_COMPANY_TENANT_INVALID"));

        when(persons.findNaturalPersonById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, 1L, null, 2L, "12 rue", "900", null, null, null)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Bailleur introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("PERSON_NOT_FOUND"));
        when(persons.findNaturalPersonById(1L)).thenReturn(Optional.of(person(1L, "Bailleur")));
        when(persons.findNaturalPersonById(2L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, 1L, null, 2L, "12 rue", "900", null, null, null)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Locataire introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("PERSON_NOT_FOUND"));

        when(persons.findNaturalPersonById(2L)).thenReturn(Optional.of(person(2L, "Locataire")));
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, 1L, null, 2L, " ", "900", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("L'adresse du bien est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("ADDRESS_REQUIRED"));
    }

    @Test
    @DisplayName("An active lease for the same parties is rejected on create and update")
    void duplicateLease() {
        when(persons.findNaturalPersonById(1L)).thenReturn(Optional.of(person(1L, "Bailleur")));
        when(persons.findNaturalPersonById(2L)).thenReturn(Optional.of(person(2L, "Locataire")));
        when(leases.existsByLandlordIdAndTenantIdAndDeletedFalse(1L, 2L)).thenReturn(true);
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, 1L, null, 2L, "12 rue", "900", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Un bail actif existe déjà pour ce bailleur et ce locataire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LEASE_ALREADY_EXISTS"));

        when(leases.findByIdAndDeletedFalse(3L)).thenReturn(Optional.of(normalLease()));
        when(leases.existsByLandlordIdAndTenantIdAndDeletedFalseAndIdNot(1L, 2L, 3L)).thenReturn(true);
        assertThatThrownBy(() -> service.updateLease(3L,
                new LeaseRequest(false, 1L, null, 2L, "12 rue", "900", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LEASE_ALREADY_EXISTS"));

        when(companies.entity(7L)).thenReturn(company(7L, "Société"));
        when(leases.existsByLandlordIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalse(1L, 7L)).thenReturn(true);
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(true, 1L, 7L, null, "12 rue", "900", null, "70", "25")))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LEASE_ALREADY_EXISTS"));
    }

    @Test
    @DisplayName("A second active company lease for the same company is allowed with another landlord")
    void secondCompanyLeaseIsAllowed() {
        when(persons.findNaturalPersonById(1L)).thenReturn(Optional.of(person(1L, "Bailleur")));
        when(companies.entity(7L)).thenReturn(company(7L, "Société"));
        when(companies.find(7L)).thenReturn(Optional.of(company(7L, "Société")));
        when(leases.save(any(Lease.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LeaseDto created = service.createLease(
                new LeaseRequest(true, 1L, 7L, null, "12 rue", "900", null, "70", "25"));

        assertThat(created.companyLease()).isTrue();
        assertThat(created.companyId()).isEqualTo(7L);
    }

    @Test
    @DisplayName("A normal lease cannot duplicate the pro-rata company link")
    void normalLeaseAlreadyLinkedIsRejected() {
        when(persons.findNaturalPersonById(1L)).thenReturn(Optional.of(person(1L, "Bailleur")));
        when(persons.findNaturalPersonById(2L)).thenReturn(Optional.of(person(2L, "Locataire")));
        when(companies.entity(7L)).thenReturn(company(7L, "Société"));
        when(leases.existsByCompanyIdAndCompanyLeaseFalseAndDeletedFalse(7L)).thenReturn(true);

        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, 1L, 7L, 2L, "12 rue", "900", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Cette société est déjà liée à un bail actif.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("LEASE_COMPANY_ALREADY_LINKED"));

        when(leases.existsByCompanyIdAndCompanyLeaseFalseAndDeletedFalseAndIdNot(7L, 5L)).thenReturn(true);
        Lease existing = companyLease();
        existing.setCompanyLease(false);
        existing.setTenant(person(8L, "Locataire 8"));
        existing.setTotalArea(null);
        existing.setBusinessArea(null);
        when(leases.findByIdAndDeletedFalse(5L)).thenReturn(Optional.of(existing));
        assertThatThrownBy(() -> service.updateLease(5L,
                new LeaseRequest(false, 1L, 7L, 2L, "12 rue", "900", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Cette société est déjà liée à un bail actif.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("LEASE_COMPANY_ALREADY_LINKED"));
    }

    @Test
    @DisplayName("A lease update keeps its own company link and accepts no company")
    void companyLinkExcludesCurrentLease() {
        when(persons.findNaturalPersonById(1L)).thenReturn(Optional.of(person(1L, "Bailleur")));
        when(persons.findNaturalPersonById(2L)).thenReturn(Optional.of(person(2L, "Locataire")));
        when(companies.entity(9L)).thenReturn(company(9L, "Société pro-rata"));
        when(companies.find(9L)).thenReturn(Optional.of(company(9L, "Société pro-rata")));
        when(leases.save(any(Lease.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Lease existing = normalLease();
        existing.setCompanyId(9L);
        when(leases.findByIdAndDeletedFalse(3L)).thenReturn(Optional.of(existing));
        when(leases.existsByCompanyIdAndCompanyLeaseFalseAndDeletedFalseAndIdNot(9L, 3L)).thenReturn(false);

        LeaseDto updated = service.updateLease(3L,
                new LeaseRequest(false, 1L, 9L, 2L, "13 rue", "950", null, null, null));
        assertThat(updated.companyId()).isEqualTo(9L);
        verify(leases).existsByCompanyIdAndCompanyLeaseFalseAndDeletedFalseAndIdNot(9L, 3L);

        LeaseDto withoutCompany = service.createLease(
                new LeaseRequest(false, 1L, null, 2L, "12 rue", "900", null, null, null));
        assertThat(withoutCompany.companyId()).isNull();
        verify(leases, never()).existsByCompanyIdAndCompanyLeaseFalseAndDeletedFalse(anyLong());
    }

    @Test
    @DisplayName("Missing entities are not found in French")
    void notFound() {
        when(leases.findByIdAndDeletedFalse(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateLease(9L,
                new LeaseRequest(false, 1L, null, 2L, "x", "1", null, null, null)))
                .isInstanceOf(NotFoundException.class).hasMessage("Bail introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("LEASE_NOT_FOUND"));
        assertThatThrownBy(() -> service.deleteLease(9L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("The active lease is resolved by person pair or company tenant")
    void resolveLease() {
        assertThatThrownBy(() -> service.resolveLease(null, 2L, null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Sélectionnez un bailleur et un locataire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LEASE_PARTIES_REQUIRED"));
        assertThatThrownBy(() -> service.resolveLease(1L, null, null))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LEASE_PARTIES_REQUIRED"));
        assertThatThrownBy(() -> service.resolveLease(1L, 2L, 7L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Sélectionnez un seul locataire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("LEASE_SINGLE_TENANT_REQUIRED"));

        when(leases.findFirstByLandlordIdAndTenantIdAndDeletedFalse(1L, 2L))
                .thenReturn(Optional.of(normalLease()));
        assertThat(service.resolveLease(1L, 2L, null).getId()).isEqualTo(3L);

        when(leases.findFirstByLandlordIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalse(1L, 7L))
                .thenReturn(Optional.of(companyLease()));
        assertThat(service.resolveLease(1L, null, 7L).getId()).isEqualTo(5L);

        when(leases.findFirstByLandlordIdAndTenantIdAndDeletedFalse(4L, 5L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.resolveLease(4L, 5L, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Aucun bail actif")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("LEASE_ACTIVE_NOT_FOUND"));
    }

    @Test
    @DisplayName("The example lease is the first non deleted lease or null")
    void exampleLease() {
        when(leases.findFirstByDeletedFalseOrderByIdAsc()).thenReturn(Optional.of(normalLease()));
        assertThat(service.exampleLease()).isNotNull();
        when(leases.findFirstByDeletedFalseOrderByIdAsc()).thenReturn(Optional.empty());
        assertThat(service.exampleLease()).isNull();
    }
}
