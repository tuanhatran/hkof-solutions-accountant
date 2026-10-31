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

import fr.hkof.homeofficeexpenses.domain.Tenant;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseTenantRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.repository.TenantRepository;
import fr.hkof.homeofficeexpenses.web.dto.TenantDtos.TenantDto;
import fr.hkof.homeofficeexpenses.web.dto.TenantDtos.TenantRequest;

class TenantServiceTest {

    private static final Long USER_ID = 42L;

    private TenantRepository tenants;
    private LeaseRepository leases;
    private LeaseTenantRepository leaseTenants;
    private SignatureRepository signatures;
    private OwnershipContext ownership;
    private TenantService service;

    @BeforeEach
    void setUp() {
        tenants = mock(TenantRepository.class);
        leases = mock(LeaseRepository.class);
        leaseTenants = mock(LeaseTenantRepository.class);
        signatures = mock(SignatureRepository.class);
        ownership = mock(OwnershipContext.class);
        when(ownership.currentUserId()).thenReturn(USER_ID);
        service = new TenantService(tenants, leases, leaseTenants, signatures, ownership,
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private Tenant tenant(Long id, String name) {
        Tenant tenant = new Tenant();
        tenant.setId(id);
        tenant.setUserId(USER_ID);
        tenant.setName(name);
        tenant.setAddress("Adresse");
        return tenant;
    }

    @Test
    @DisplayName("Tenants are listed with their profile fields")
    void lists() {
        Tenant tenant = tenant(1L, "Alice");
        tenant.setEmail("alice@example.test");
        when(tenants.findAllByUserId(USER_ID)).thenReturn(List.of(tenant));

        List<TenantDto> result = service.list();

        assertThat(result).extracting(TenantDto::name).containsExactly("Alice");
        assertThat(result.get(0).email()).isEqualTo("alice@example.test");
    }

    @Test
    @DisplayName("Tenants can be created, updated and logically deleted")
    void crud() {
        when(tenants.save(any(Tenant.class))).thenAnswer(invocation -> {
            Tenant saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        TenantDto created = service.create(new TenantRequest("  Alice ", "  ", " 06 12 34 56 78 ",
                "  alice@example.test ", "  Étage 2 "));
        assertThat(created.name()).isEqualTo("Alice");
        assertThat(created.address()).isNull();
        assertThat(created.phone()).isEqualTo("06 12 34 56 78");
        assertThat(created.email()).isEqualTo("alice@example.test");
        assertThat(created.addressNote()).isEqualTo("Étage 2");

        Tenant existing = tenant(1L, "Alice");
        when(tenants.findByIdAndUserIdAndDeletedFalse(1L, USER_ID)).thenReturn(Optional.of(existing));
        TenantDto updated = service.update(1L, new TenantRequest("Alicia", "2 rue", null, "   ", null));
        assertThat(updated.name()).isEqualTo("Alicia");
        assertThat(updated.address()).isEqualTo("2 rue");
        assertThat(updated.email()).isNull();

        service.delete(1L);
        assertThat(existing.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("An omitted phone, email or address note keeps the stored value")
    void preservesOmittedProfileFieldsOnUpdate() {
        Tenant existing = tenant(1L, "Alice");
        existing.setPhone("06 12 34 56 78");
        existing.setEmail("alice@example.test");
        existing.setAddressNote("Étage 2");
        when(tenants.findByIdAndUserIdAndDeletedFalse(1L, USER_ID)).thenReturn(Optional.of(existing));
        when(tenants.save(any(Tenant.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TenantDto kept = service.update(1L, new TenantRequest("Alice", null, null, null, null));
        assertThat(kept.phone()).isEqualTo("06 12 34 56 78");
        assertThat(kept.email()).isEqualTo("alice@example.test");
        assertThat(kept.addressNote()).isEqualTo("Étage 2");
    }

    @Test
    @DisplayName("A tenant with signatures or an active lease cannot be deleted")
    void deletionGuards() {
        when(tenants.findByIdAndUserIdAndDeletedFalse(1L, USER_ID)).thenReturn(Optional.of(tenant(1L, "Alice")));
        when(signatures.existsByPersonIdAndDeletedFalse(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ce locataire porte des signatures et ne peut pas être supprimé.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("TENANT_HAS_SIGNATURES"));
        verify(tenants, never()).save(any(Tenant.class));

        when(signatures.existsByPersonIdAndDeletedFalse(1L)).thenReturn(false);
        when(leases.existsByTenantIdAndDeletedFalse(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ce locataire est utilisé par un bail actif et ne peut pas être supprimé.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("TENANT_IN_USE"));

        when(leases.existsByTenantIdAndDeletedFalse(1L)).thenReturn(false);
        when(leaseTenants.existsByPersonIdAndLeaseDeletedFalse(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("TENANT_IN_USE"));
    }

    @Test
    @DisplayName("Blank names and unknown tenants are rejected in French")
    void validation() {
        assertThatThrownBy(() -> service.create(new TenantRequest(" ", null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom du locataire est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("TENANT_NAME_REQUIRED"));

        when(tenants.findByIdAndUserIdAndDeletedFalse(9L, USER_ID)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update(9L, new TenantRequest("x", null, null, null, null)))
                .isInstanceOf(NotFoundException.class).hasMessage("Locataire introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("TENANT_NOT_FOUND"));
    }
}
