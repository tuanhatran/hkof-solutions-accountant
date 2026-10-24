package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Landlord;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.Tenant;
import fr.hkof.homeofficeexpenses.repository.LandlordRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.TenantRepository;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LandlordDto;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LandlordRequest;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LeaseDto;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LeaseRequest;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.TenantDto;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.TenantRequest;

class RentConfigurationServiceTest {

    private static final Long COMPANY_ID = 1L;

    private LandlordRepository landlords;
    private TenantRepository tenants;
    private LeaseRepository leases;
    private CompanyService companies;
    private RentConfigurationService service;

    @BeforeEach
    void setUp() {
        landlords = mock(LandlordRepository.class);
        tenants = mock(TenantRepository.class);
        leases = mock(LeaseRepository.class);
        companies = mock(CompanyService.class);
        service = new RentConfigurationService(landlords, tenants, leases, companies,
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private Company company() {
        Company company = new Company();
        company.setId(COMPANY_ID);
        company.setName("HKOF");
        return company;
    }

    private Landlord landlord() {
        Landlord landlord = new Landlord();
        landlord.setId(1L);
        landlord.setName("Bailleur");
        landlord.setAddress("1 rue du Bail");
        return landlord;
    }

    private Tenant tenant() {
        Tenant tenant = new Tenant();
        tenant.setId(2L);
        tenant.setName("Locataire");
        tenant.setAddress("2 rue du Locataire");
        return tenant;
    }

    private Lease lease() {
        Lease lease = new Lease();
        lease.setId(3L);
        lease.setLandlord(landlord());
        lease.setTenant(tenant());
        lease.setCompanyLease(true);
        lease.setTotalArea(new BigDecimal("70.00"));
        lease.setBusinessArea(new BigDecimal("25.00"));
        lease.setPropertyAddress("12 rue de la République");
        lease.setRentExclCharges(new BigDecimal("900.00"));
        lease.setCharges(new BigDecimal("50.00"));
        return lease;
    }

    @Test
    @DisplayName("Directories list and map every entity")
    void lists() {
        when(landlords.findAllByDeletedFalseOrderByNameAsc()).thenReturn(List.of(landlord()));
        when(tenants.findAllByDeletedFalseOrderByNameAsc()).thenReturn(List.of(tenant()));
        when(leases.findAllByDeletedFalseOrderByIdAsc()).thenReturn(List.of(lease()));

        assertThat(service.listLandlords()).extracting(LandlordDto::name).containsExactly("Bailleur");
        assertThat(service.listTenants()).extracting(TenantDto::name).containsExactly("Locataire");
        assertThat(service.listLeases()).extracting(LeaseDto::propertyAddress).containsExactly("12 rue de la République");
    }

    @Test
    @DisplayName("Landlords can be created, updated and logically deleted")
    void landlordCrud() {
        when(landlords.save(any(Landlord.class))).thenAnswer(invocation -> {
            Landlord saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });
        LandlordDto created = service.createLandlord(new LandlordRequest("  Bailleur ", "  "));
        assertThat(created.name()).isEqualTo("Bailleur");
        assertThat(created.address()).isNull();

        Landlord existing = landlord();
        when(landlords.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(existing));
        LandlordDto updated = service.updateLandlord(1L, new LandlordRequest("Nouveau", "Adresse"));
        assertThat(updated.name()).isEqualTo("Nouveau");
        assertThat(updated.address()).isEqualTo("Adresse");

        when(leases.existsByLandlordIdAndDeletedFalse(1L)).thenReturn(false);
        service.deleteLandlord(1L);
        assertThat(existing.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("A landlord used by an active lease cannot be deleted")
    void landlordInUse() {
        when(landlords.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(landlord()));
        when(leases.existsByLandlordIdAndDeletedFalse(1L)).thenReturn(true);

        assertThatThrownBy(() -> service.deleteLandlord(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ce bailleur est utilisé par un bail actif et ne peut pas être supprimé.");
        verify(landlords, never()).save(any());
    }

    @Test
    @DisplayName("Tenants can be created, updated and logically deleted")
    void tenantCrud() {
        when(tenants.save(any(Tenant.class))).thenAnswer(invocation -> {
            Tenant saved = invocation.getArgument(0);
            saved.setId(2L);
            return saved;
        });
        TenantDto created = service.createTenant(new TenantRequest("Locataire", null));
        assertThat(created.name()).isEqualTo("Locataire");
        assertThat(created.address()).isNull();

        Tenant existing = tenant();
        when(tenants.findByIdAndDeletedFalse(2L)).thenReturn(Optional.of(existing));
        assertThat(service.updateTenant(2L, new TenantRequest("Nouveau", "Adresse")).name())
                .isEqualTo("Nouveau");

        when(leases.existsByTenantIdAndDeletedFalse(2L)).thenReturn(false);
        service.deleteTenant(2L);
        assertThat(existing.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("A tenant used by an active lease cannot be deleted")
    void tenantInUse() {
        when(tenants.findByIdAndDeletedFalse(2L)).thenReturn(Optional.of(tenant()));
        when(leases.existsByTenantIdAndDeletedFalse(2L)).thenReturn(true);

        assertThatThrownBy(() -> service.deleteTenant(2L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ce locataire est utilisé par un bail actif et ne peut pas être supprimé.");
    }

    @Test
    @DisplayName("Leases can be created, updated and logically deleted")
    void leaseCrud() {
        when(landlords.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(landlord()));
        when(tenants.findByIdAndDeletedFalse(2L)).thenReturn(Optional.of(tenant()));
        when(leases.existsByLandlordIdAndTenantIdAndDeletedFalse(1L, 2L)).thenReturn(false);
        when(leases.save(any(Lease.class))).thenAnswer(invocation -> {
            Lease saved = invocation.getArgument(0);
            saved.setId(3L);
            return saved;
        });

        LeaseDto created = service.createLease(
                new LeaseRequest(true, 1L, 2L, "12 rue", "900", null, "70", "25"));
        assertThat(created.rentExclCharges()).isEqualTo("900.00");
        assertThat(created.charges()).isEqualTo("0.00");
        assertThat(created.companyLease()).isTrue();
        assertThat(created.totalArea()).isEqualTo("70.00");
        assertThat(created.businessArea()).isEqualTo("25.00");
        assertThat(created.companyId()).isNull();
        assertThat(created.companyName()).isNull();

        Lease existing = lease();
        when(leases.findByIdAndDeletedFalse(3L)).thenReturn(Optional.of(existing));
        when(leases.existsByLandlordIdAndTenantIdAndDeletedFalseAndIdNot(1L, 2L, 3L)).thenReturn(false);
        assertThat(service.updateLease(3L, new LeaseRequest(true, 1L, 2L, "13 rue", "950", "60", "80", "20"))
                .propertyAddress()).isEqualTo("13 rue");
        assertThat(existing.getTotalArea()).isEqualByComparingTo("80.00");
        assertThat(existing.getBusinessArea()).isEqualByComparingTo("20.00");

        service.deleteLease(3L);
        assertThat(existing.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("A lease update keeps the existing company link and non company leases clear surfaces")
    void preservesCompanyLinkOnUpdate() {
        Lease existing = lease();
        existing.setCompanyId(9L);
        when(landlords.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(landlord()));
        when(tenants.findByIdAndDeletedFalse(2L)).thenReturn(Optional.of(tenant()));
        when(leases.findByIdAndDeletedFalse(3L)).thenReturn(Optional.of(existing));
        when(leases.existsByLandlordIdAndTenantIdAndDeletedFalseAndIdNot(1L, 2L, 3L)).thenReturn(false);
        when(leases.save(any(Lease.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateLease(3L, new LeaseRequest(false, 1L, 2L, "12 rue", "900", null, "70", "25"));

        assertThat(existing.getCompanyId()).isEqualTo(9L);
        assertThat(existing.isCompanyLease()).isFalse();
        assertThat(existing.getTotalArea()).isNull();
        assertThat(existing.getBusinessArea()).isNull();
    }

    @Test
    @DisplayName("A company lease requires both surfaces and a coherent business area")
    void companyLeaseRequiresSurfaces() {
        when(landlords.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(landlord()));
        when(tenants.findByIdAndDeletedFalse(2L)).thenReturn(Optional.of(tenant()));
        when(leases.existsByLandlordIdAndTenantIdAndDeletedFalse(1L, 2L)).thenReturn(false);

        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(true, 1L, 2L, "12 rue", "900", null, null, "25")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Les surfaces sont obligatoires pour un bail société.");
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(true, 1L, 2L, "12 rue", "900", null, "70", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Les surfaces sont obligatoires pour un bail société.");
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(true, 1L, 2L, "12 rue", "900", null, "70", "80")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La surface professionnelle doit être comprise entre 0 et la surface totale.");
    }

    @Test
    @DisplayName("Lease creation requires both identifiers and existing parties")
    void leaseValidation() {
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, null, 2L, "12 rue", "900", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Sélectionnez un bailleur et un locataire.");
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, 1L, null, "12 rue", "900", null, null, null)))
                .isInstanceOf(BusinessException.class);
        when(landlords.findByIdAndDeletedFalse(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, 1L, 2L, "12 rue", "900", null, null, null)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Bailleur introuvable.");
        when(landlords.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(landlord()));
        when(tenants.findByIdAndDeletedFalse(2L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, 1L, 2L, "12 rue", "900", null, null, null)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Locataire introuvable.");
    }

    @Test
    @DisplayName("An active lease for the same pair is rejected on create and update")
    void duplicateLease() {
        when(landlords.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(landlord()));
        when(tenants.findByIdAndDeletedFalse(2L)).thenReturn(Optional.of(tenant()));
        when(leases.existsByLandlordIdAndTenantIdAndDeletedFalse(1L, 2L)).thenReturn(true);
        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, 1L, 2L, "12 rue", "900", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Un bail actif existe déjà pour ce bailleur et ce locataire.");

        when(leases.findByIdAndDeletedFalse(3L)).thenReturn(Optional.of(lease()));
        when(leases.existsByLandlordIdAndTenantIdAndDeletedFalseAndIdNot(1L, 2L, 3L)).thenReturn(true);
        assertThatThrownBy(() -> service.updateLease(3L,
                new LeaseRequest(false, 1L, 2L, "12 rue", "900", null, null, null)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("A blank property address is rejected")
    void leaseRequiresAddress() {
        when(landlords.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(landlord()));
        when(tenants.findByIdAndDeletedFalse(2L)).thenReturn(Optional.of(tenant()));
        when(leases.existsByLandlordIdAndTenantIdAndDeletedFalse(1L, 2L)).thenReturn(false);

        assertThatThrownBy(() -> service.createLease(
                new LeaseRequest(false, 1L, 2L, " ", "900", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("L'adresse du bien est obligatoire.");
    }

    @Test
    @DisplayName("A blank name is rejected for landlords and tenants")
    void namesRequired() {
        assertThatThrownBy(() -> service.createLandlord(new LandlordRequest(null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom du bailleur est obligatoire.");
        assertThatThrownBy(() -> service.createLandlord(new LandlordRequest(" ", null)))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.createTenant(new TenantRequest(" ", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom du locataire est obligatoire.");
        assertThatThrownBy(() -> service.createTenant(new TenantRequest(null, null)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("Missing entities are not found in French")
    void notFound() {
        when(landlords.findByIdAndDeletedFalse(9L)).thenReturn(Optional.empty());
        when(tenants.findByIdAndDeletedFalse(9L)).thenReturn(Optional.empty());
        when(leases.findByIdAndDeletedFalse(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateLandlord(9L, new LandlordRequest("x", null)))
                .isInstanceOf(NotFoundException.class).hasMessage("Bailleur introuvable.");
        assertThatThrownBy(() -> service.deleteLandlord(9L))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.updateTenant(9L, new TenantRequest("x", null)))
                .isInstanceOf(NotFoundException.class).hasMessage("Locataire introuvable.");
        assertThatThrownBy(() -> service.deleteTenant(9L))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.updateLease(9L,
                new LeaseRequest(false, 1L, 2L, "x", "1", null, null, null)))
                .isInstanceOf(NotFoundException.class).hasMessage("Bail introuvable.");
        assertThatThrownBy(() -> service.deleteLease(9L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("The active lease of a pair is resolved or a French error is raised")
    void resolveLease() {
        assertThatThrownBy(() -> service.resolveLease(null, 2L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Sélectionnez un bailleur et un locataire.");
        assertThatThrownBy(() -> service.resolveLease(1L, null))
                .isInstanceOf(BusinessException.class);

        when(leases.findFirstByLandlordIdAndTenantIdAndDeletedFalse(1L, 2L)).thenReturn(Optional.of(lease()));
        assertThat(service.resolveLease(1L, 2L).getId()).isEqualTo(3L);

        when(leases.findFirstByLandlordIdAndTenantIdAndDeletedFalse(4L, 5L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.resolveLease(4L, 5L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Aucun bail actif");
    }

    @Test
    @DisplayName("The example lease is the first non deleted lease or null")
    void exampleLease() {
        when(leases.findFirstByDeletedFalseOrderByIdAsc()).thenReturn(Optional.of(lease()));
        assertThat(service.exampleLease()).isNotNull();
        when(leases.findFirstByDeletedFalseOrderByIdAsc()).thenReturn(Optional.empty());
        assertThat(service.exampleLease()).isNull();
    }
}
