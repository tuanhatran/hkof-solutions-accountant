package fr.hkof.homeofficeexpenses.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Tenant;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseTenantRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.repository.TenantRepository;
import fr.hkof.homeofficeexpenses.web.dto.TenantDtos.TenantDto;
import fr.hkof.homeofficeexpenses.web.dto.TenantDtos.TenantRequest;

/**
 * Tenant directory: natural persons paying rent on a lease. Tenants share the person table
 * with landlords and employees and carry the shared {@code person.email} column.
 */
@Service
public class TenantService {

    private final TenantRepository tenants;
    private final LeaseRepository leases;
    private final LeaseTenantRepository leaseTenants;
    private final SignatureRepository signatures;
    private final OwnershipContext ownership;
    private final Clock clock;

    public TenantService(TenantRepository tenants, LeaseRepository leases, LeaseTenantRepository leaseTenants,
            SignatureRepository signatures, OwnershipContext ownership, Clock clock) {
        this.tenants = tenants;
        this.leases = leases;
        this.leaseTenants = leaseTenants;
        this.signatures = signatures;
        this.ownership = ownership;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<TenantDto> list() {
        return tenants.findAllByUserId(ownership.currentUserId()).stream().map(this::toDto).toList();
    }

    @Transactional
    public TenantDto create(TenantRequest request) {
        Tenant tenant = new Tenant();
        tenant.setUserId(ownership.currentUserId());
        apply(tenant, request);
        Instant now = Instant.now(clock);
        tenant.setDeleted(false);
        tenant.setCreatedAt(now);
        tenant.setUpdatedAt(now);
        return toDto(tenants.save(tenant));
    }

    @Transactional
    public TenantDto update(Long id, TenantRequest request) {
        Tenant tenant = entity(id);
        apply(tenant, request);
        tenant.setUpdatedAt(Instant.now(clock));
        return toDto(tenants.save(tenant));
    }

    @Transactional
    public void delete(Long id) {
        Tenant tenant = entity(id);
        if (signatures.existsByPersonIdAndDeletedFalse(id)) {
            throw new BusinessException("TENANT_HAS_SIGNATURES",
                    "Ce locataire porte des signatures et ne peut pas être supprimé.");
        }
        if (leases.existsByTenantIdAndDeletedFalse(id) || leaseTenants.existsByPersonIdAndLeaseDeletedFalse(id)) {
            throw new BusinessException("TENANT_IN_USE",
                    "Ce locataire est utilisé par un bail actif et ne peut pas être supprimé.");
        }
        tenant.setDeleted(true);
        tenant.setUpdatedAt(Instant.now(clock));
        tenants.save(tenant);
    }

    @Transactional(readOnly = true)
    public Tenant entity(Long id) {
        return tenants.findByIdAndUserIdAndDeletedFalse(id, ownership.currentUserId())
                .orElseThrow(() -> new NotFoundException("TENANT_NOT_FOUND", "Locataire introuvable."));
    }

    public TenantDto toDto(Tenant tenant) {
        return new TenantDto(tenant.getId(), tenant.getName(), tenant.getAddress(), tenant.getPhone(),
                tenant.getEmail(), tenant.getAddressNote());
    }

    private void apply(Tenant tenant, TenantRequest request) {
        String name = request.name() == null ? "" : request.name().trim();
        if (name.isEmpty()) {
            throw new BusinessException("TENANT_NAME_REQUIRED", "Le nom du locataire est obligatoire.");
        }
        tenant.setName(name);
        tenant.setAddress(OptionalTexts.trimToNull(request.address()));
        tenant.setPhone(OptionalTexts.preserve(request.phone(), tenant.getPhone()));
        tenant.setEmail(OptionalTexts.preserve(request.email(), tenant.getEmail()));
        tenant.setAddressNote(OptionalTexts.preserve(request.addressNote(), tenant.getAddressNote()));
    }
}
