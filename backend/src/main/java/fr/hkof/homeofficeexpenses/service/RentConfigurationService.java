package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

/**
 * Landlord, tenant and lease directories backing the rent receipt configuration.
 * A pair of one landlord and one tenant has at most one active (non-deleted) lease, which
 * supplies the property address and the default rent amounts used when generating a receipt.
 */
@Service
public class RentConfigurationService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(Amounts.SCALE, RoundingMode.HALF_UP);

    private final LandlordRepository landlords;
    private final TenantRepository tenants;
    private final LeaseRepository leases;
    private final CompanyService companies;
    private final Clock clock;

    public RentConfigurationService(LandlordRepository landlords, TenantRepository tenants, LeaseRepository leases,
            CompanyService companies, Clock clock) {
        this.landlords = landlords;
        this.tenants = tenants;
        this.leases = leases;
        this.companies = companies;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<LandlordDto> listLandlords() {
        return landlords.findAllByDeletedFalseOrderByNameAsc().stream().map(this::toDto).toList();
    }

    @Transactional
    public LandlordDto createLandlord(LandlordRequest request) {
        Landlord landlord = new Landlord();
        apply(landlord, request);
        landlord.setDeleted(false);
        landlord.setCreatedAt(Instant.now(clock));
        return toDto(landlords.save(landlord));
    }

    @Transactional
    public LandlordDto updateLandlord(Long id, LandlordRequest request) {
        Landlord landlord = landlord(id);
        apply(landlord, request);
        return toDto(landlords.save(landlord));
    }

    @Transactional
    public void deleteLandlord(Long id) {
        Landlord landlord = landlord(id);
        if (leases.existsByLandlordIdAndDeletedFalse(id)) {
            throw new BusinessException("Ce bailleur est utilisé par un bail actif et ne peut pas être supprimé.");
        }
        landlord.setDeleted(true);
        landlords.save(landlord);
    }

    @Transactional(readOnly = true)
    public List<TenantDto> listTenants() {
        return tenants.findAllByDeletedFalseOrderByNameAsc().stream().map(this::toDto).toList();
    }

    @Transactional
    public TenantDto createTenant(TenantRequest request) {
        Tenant tenant = new Tenant();
        apply(tenant, request);
        tenant.setDeleted(false);
        tenant.setCreatedAt(Instant.now(clock));
        return toDto(tenants.save(tenant));
    }

    @Transactional
    public TenantDto updateTenant(Long id, TenantRequest request) {
        Tenant tenant = tenant(id);
        apply(tenant, request);
        return toDto(tenants.save(tenant));
    }

    @Transactional
    public void deleteTenant(Long id) {
        Tenant tenant = tenant(id);
        if (leases.existsByTenantIdAndDeletedFalse(id)) {
            throw new BusinessException("Ce locataire est utilisé par un bail actif et ne peut pas être supprimé.");
        }
        tenant.setDeleted(true);
        tenants.save(tenant);
    }

    @Transactional(readOnly = true)
    public List<LeaseDto> listLeases() {
        return leases.findAllByDeletedFalseOrderByIdAsc().stream().map(this::toDto).toList();
    }

    @Transactional
    public LeaseDto createLease(LeaseRequest request) {
        Lease lease = new Lease();
        apply(lease, request, null);
        lease.setDeleted(false);
        lease.setCreatedAt(Instant.now(clock));
        return toDto(leases.save(lease));
    }

    @Transactional
    public LeaseDto updateLease(Long id, LeaseRequest request) {
        Lease lease = lease(id);
        apply(lease, request, id);
        return toDto(leases.save(lease));
    }

    @Transactional
    public void deleteLease(Long id) {
        Lease lease = lease(id);
        lease.setDeleted(true);
        leases.save(lease);
    }

    /**
     * Returns the active lease of the pair, or fails with a French message. Both identifiers
     * are required so a receipt can never be generated without a selected pair.
     */
    @Transactional(readOnly = true)
    public Lease resolveLease(Long landlordId, Long tenantId) {
        if (landlordId == null || tenantId == null) {
            throw new BusinessException("Sélectionnez un bailleur et un locataire.");
        }
        return leases.findFirstByLandlordIdAndTenantIdAndDeletedFalse(landlordId, tenantId)
                .orElseThrow(() -> new BusinessException(
                        "Aucun bail actif pour ce bailleur et ce locataire. Créez un bail dans la page Configuration."));
    }

    /** Lease used by the admin template preview; never persisted. */
    @Transactional(readOnly = true)
    public Lease exampleLease() {
        return leases.findFirstByDeletedFalseOrderByIdAsc().orElse(null);
    }

    private void apply(Landlord landlord, LandlordRequest request) {
        landlord.setName(requiredText(request.name(), "Le nom du bailleur est obligatoire."));
        landlord.setAddress(optionalText(request.address()));
    }

    private void apply(Tenant tenant, TenantRequest request) {
        tenant.setName(requiredText(request.name(), "Le nom du locataire est obligatoire."));
        tenant.setAddress(optionalText(request.address()));
    }

    private void apply(Lease lease, LeaseRequest request, Long currentId) {
        if (request.landlordId() == null || request.tenantId() == null) {
            throw new BusinessException("Sélectionnez un bailleur et un locataire.");
        }
        Landlord landlord = landlords.findByIdAndDeletedFalse(request.landlordId())
                .orElseThrow(() -> new NotFoundException("Bailleur introuvable."));
        Tenant tenant = tenants.findByIdAndDeletedFalse(request.tenantId())
                .orElseThrow(() -> new NotFoundException("Locataire introuvable."));
        boolean pairTaken = currentId == null
                ? leases.existsByLandlordIdAndTenantIdAndDeletedFalse(landlord.getId(), tenant.getId())
                : leases.existsByLandlordIdAndTenantIdAndDeletedFalseAndIdNot(landlord.getId(), tenant.getId(),
                        currentId);
        if (pairTaken) {
            throw new BusinessException("Un bail actif existe déjà pour ce bailleur et ce locataire.");
        }
        lease.setLandlord(landlord);
        lease.setTenant(tenant);
        lease.setCompanyId(request.companyId() == null ? null : companies.entity(request.companyId()).getId());
        lease.setPropertyAddress(requiredText(request.propertyAddress(), "L'adresse du bien est obligatoire."));
        lease.setRentExclCharges(Amounts.decimal(request.rentExclCharges(), "loyer hors charges", false));
        lease.setCharges(request.charges() == null || request.charges().isBlank()
                ? ZERO
                : Amounts.decimal(request.charges(), "provision pour charges", false));
    }

    private Landlord landlord(Long id) {
        return landlords.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Bailleur introuvable."));
    }

    private Tenant tenant(Long id) {
        return tenants.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Locataire introuvable."));
    }

    private Lease lease(Long id) {
        return leases.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Bail introuvable."));
    }

    private String requiredText(String value, String message) {
        String cleaned = value == null ? "" : value.trim();
        if (cleaned.isEmpty()) {
            throw new BusinessException(message);
        }
        return cleaned;
    }

    private String optionalText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private LandlordDto toDto(Landlord landlord) {
        return new LandlordDto(landlord.getId(), landlord.getName(), landlord.getAddress());
    }

    private TenantDto toDto(Tenant tenant) {
        return new TenantDto(tenant.getId(), tenant.getName(), tenant.getAddress());
    }

    private LeaseDto toDto(Lease lease) {
        String companyName = lease.getCompanyId() == null
                ? null
                : companies.find(lease.getCompanyId()).map(company -> company.getName()).orElse(null);
        return new LeaseDto(
                lease.getId(),
                lease.getCompanyId(),
                companyName,
                lease.getLandlord().getId(),
                lease.getTenant().getId(),
                lease.getLandlord().getName(),
                lease.getTenant().getName(),
                lease.getPropertyAddress(),
                Amounts.apiValue(lease.getRentExclCharges()),
                Amounts.apiValue(lease.getCharges()));
    }
}
