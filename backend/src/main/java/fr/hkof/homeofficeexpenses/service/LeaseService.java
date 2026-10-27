package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.Person;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.PersonRepository;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LeaseDto;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LeaseRequest;

/**
 * Lease directory. A company lease pairs a natural person landlord with a company tenant;
 * a normal lease pairs two distinct natural persons. Employees are never lease parties.
 */
@Service
public class LeaseService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(Amounts.SCALE, RoundingMode.HALF_UP);

    private final PersonRepository persons;
    private final EmployeeRepository employees;
    private final LeaseRepository leases;
    private final CompanyService companies;
    private final AddressService addresses;
    private final Clock clock;

    public LeaseService(PersonRepository persons, EmployeeRepository employees, LeaseRepository leases,
            CompanyService companies, AddressService addresses, Clock clock) {
        this.persons = persons;
        this.employees = employees;
        this.leases = leases;
        this.companies = companies;
        this.addresses = addresses;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<LeaseDto> listLeases() {
        return leases.findAllByDeletedFalseOrderByIdAsc().stream().map(this::toDto).toList();
    }

    @Transactional
    public LeaseDto createLease(LeaseRequest request) {
        Lease lease = new Lease();
        apply(lease, request, null, null);
        lease.setDeleted(false);
        lease.setCreatedAt(Instant.now(clock));
        return toDto(leases.save(lease));
    }

    @Transactional
    public LeaseDto updateLease(Long id, LeaseRequest request) {
        Lease lease = lease(id);
        apply(lease, request, id, lease.getCompanyId());
        return toDto(leases.save(lease));
    }

    @Transactional
    public void deleteLease(Long id) {
        Lease lease = lease(id);
        lease.setDeleted(true);
        leases.save(lease);
    }

    /**
     * Returns the active lease matching the landlord and exactly one tenant reference.
     */
    @Transactional(readOnly = true)
    public Lease resolveLease(Long landlordId, Long tenantId, Long tenantCompanyId) {
        if (landlordId == null || (tenantId == null && tenantCompanyId == null)) {
            throw new BusinessException("LEASE_PARTIES_REQUIRED", "Sélectionnez un bailleur et un locataire.");
        }
        if (tenantId != null && tenantCompanyId != null) {
            throw new BusinessException("LEASE_SINGLE_TENANT_REQUIRED", "Sélectionnez un seul locataire.");
        }
        return (tenantCompanyId != null
                ? leases.findFirstByLandlordIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalse(landlordId,
                        tenantCompanyId)
                : leases.findFirstByLandlordIdAndTenantIdAndDeletedFalse(landlordId, tenantId))
                .orElseThrow(() -> new BusinessException("LEASE_ACTIVE_NOT_FOUND",
                        "Aucun bail actif pour ce bailleur et ce locataire. Créez un bail dans la page LMNP."));
    }

    /** Lease used by the admin template preview; never persisted. */
    @Transactional(readOnly = true)
    public Lease exampleLease() {
        return leases.findFirstByDeletedFalseOrderByIdAsc().orElse(null);
    }

    /**
     * Resolves the active lease used by the expenses of a company: the requested one, validated
     * against the company, or the first active lease when no lease is requested.
     */
    @Transactional(readOnly = true)
    public Lease resolveExpenseLease(Long companyId, Long leaseId) {
        if (leaseId == null) {
            return leases.findFirstByCompanyIdAndDeletedFalseOrderByIdAsc(companyId).orElse(null);
        }
        Lease lease = leases.findByIdAndDeletedFalse(leaseId)
                .orElseThrow(() -> new NotFoundException("LEASE_NOT_FOUND", "Bail introuvable."));
        if (lease.getCompanyId() == null || !lease.getCompanyId().equals(companyId)) {
            throw new BusinessException("LEASE_NOT_IN_COMPANY", "Ce bail n'appartient pas à la société.");
        }
        return lease;
    }

    /** Pro-rata base and readable detail of the resolved lease, shared by screen, preview and PDF. */
    @Transactional(readOnly = true)
    public ProRata proRata(Long companyId, Long leaseId) {
        Lease lease = resolveExpenseLease(companyId, leaseId);
        if (lease == null) {
            return new ProRata(ZERO, "Surfaces non configurées");
        }
        BigDecimal base = CalculationService.proRataBase(lease.getBusinessArea(), lease.getTotalArea());
        return new ProRata(base, Amounts.proRataDetail(lease.getBusinessArea(), lease.getTotalArea(), base));
    }

    /** Pro-rata of the lease itself; null values when the lease carries no surfaces. */
    public static ProRata proRataOf(Lease lease) {
        if (lease == null || lease.getTotalArea() == null || lease.getBusinessArea() == null) {
            return null;
        }
        BigDecimal base = CalculationService.proRataBase(lease.getBusinessArea(), lease.getTotalArea());
        return new ProRata(base, Amounts.proRataDetail(lease.getBusinessArea(), lease.getTotalArea(), base));
    }

    /** Read-only holder: base in decimal percent plus its French detail. */
    public record ProRata(BigDecimal base, String detail) {
    }

    private void apply(Lease lease, LeaseRequest request, Long currentId, Long currentCompanyId) {
        if (request.landlordId() == null) {
            throw new BusinessException("LEASE_LANDLORD_REQUIRED", "Sélectionnez un bailleur.");
        }
        Person landlord = party(request.landlordId(), "PERSON_NOT_FOUND", "Bailleur introuvable.");
        boolean companyLease = Boolean.TRUE.equals(request.companyLease());
        Person tenant = null;
        Long companyId;
        if (companyLease) {
            if (request.tenantId() != null) {
                throw new BusinessException("LEASE_COMPANY_TENANT_INVALID",
                        "Un bail société ne comporte pas de locataire personne physique.");
            }
            if (request.companyId() == null) {
                throw new BusinessException("LEASE_TENANT_COMPANY_REQUIRED", "Sélectionnez la société locataire.");
            }
            Company company = companies.entity(request.companyId());
            companyId = company.getId();
            boolean pairTaken = currentId == null
                    ? leases.existsByLandlordIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalse(landlord.getId(),
                            companyId)
                    : leases.existsByLandlordIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalseAndIdNot(
                            landlord.getId(), companyId, currentId);
            if (pairTaken) {
                throw new BusinessException("LEASE_ALREADY_EXISTS",
                        "Un bail actif existe déjà pour ce bailleur et ce locataire.");
            }
        } else {
            if (request.tenantId() == null) {
                throw new BusinessException("LEASE_TENANT_REQUIRED", "Sélectionnez un locataire.");
            }
            tenant = party(request.tenantId(), "PERSON_NOT_FOUND", "Locataire introuvable.");
            if (tenant.getId().equals(landlord.getId())) {
                throw new BusinessException("LEASE_PARTIES_IDENTICAL",
                        "Le bailleur et le locataire doivent être deux personnes distinctes.");
            }
            boolean pairTaken = currentId == null
                    ? leases.existsByLandlordIdAndTenantIdAndDeletedFalse(landlord.getId(), tenant.getId())
                    : leases.existsByLandlordIdAndTenantIdAndDeletedFalseAndIdNot(landlord.getId(), tenant.getId(),
                            currentId);
            if (pairTaken) {
                throw new BusinessException("LEASE_ALREADY_EXISTS",
                        "Un bail actif existe déjà pour ce bailleur et ce locataire.");
            }
            companyId = request.companyId() != null ? companies.entity(request.companyId()).getId()
                    : currentCompanyId;
        }
        if (companyId != null && !companyLease) {
            boolean companyTaken = currentId == null
                    ? leases.existsByCompanyIdAndCompanyLeaseFalseAndDeletedFalse(companyId)
                    : leases.existsByCompanyIdAndCompanyLeaseFalseAndDeletedFalseAndIdNot(companyId, currentId);
            if (companyTaken) {
                throw new BusinessException("LEASE_COMPANY_ALREADY_LINKED", "Cette société est déjà liée à un bail actif.");
            }
        }
        lease.setLandlord(landlord);
        lease.setTenant(tenant);
        lease.setCompanyId(companyId);
        lease.setAddress(addresses.findOrCreate(
                requiredText(request.propertyAddress(), "ADDRESS_REQUIRED", "L'adresse du bien est obligatoire.")));
        lease.setRentExclCharges(Amounts.decimal(request.rentExclCharges(), "loyer hors charges", false));
        lease.setCharges(request.charges() == null || request.charges().isBlank()
                ? ZERO
                : Amounts.decimal(request.charges(), "provision pour charges", false));
        lease.setCompanyLease(companyLease);
        if (companyLease) {
            BigDecimal totalArea = Amounts.optionalDecimal(request.totalArea(), "surface totale");
            BigDecimal businessArea = Amounts.optionalDecimal(request.businessArea(), "surface professionnelle");
            if (totalArea == null || businessArea == null) {
                throw new BusinessException("LEASE_SURFACES_REQUIRED",
                        "Les surfaces sont obligatoires pour un bail société.");
            }
            CalculationService.proRataBase(businessArea, totalArea);
            lease.setTotalArea(totalArea);
            lease.setBusinessArea(businessArea);
        } else {
            lease.setTotalArea(null);
            lease.setBusinessArea(null);
        }
    }

    private Person party(Long id, String code, String notFound) {
        if (employees.existsByIdAndDeletedFalse(id)) {
            throw new BusinessException("LEASE_EMPLOYEE_PARTY", "Un salarié ne peut pas être partie à un bail.");
        }
        return persons.findNaturalPersonById(id)
                .orElseThrow(() -> new NotFoundException(code, notFound));
    }

    private Lease lease(Long id) {
        return leases.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("LEASE_NOT_FOUND", "Bail introuvable."));
    }

    private String requiredText(String value, String code, String message) {
        String cleaned = value == null ? "" : value.trim();
        if (cleaned.isEmpty()) {
            throw new BusinessException(code, message);
        }
        return cleaned;
    }

    private LeaseDto toDto(Lease lease) {
        String companyName = lease.getCompanyId() == null
                ? null
                : companies.find(lease.getCompanyId()).map(company -> company.getName()).orElse(null);
        String tenantName = lease.isCompanyLease()
                ? companyName
                : lease.getTenant() == null ? null : lease.getTenant().getName();
        ProRata proRata = proRataOf(lease);
        return new LeaseDto(
                lease.getId(),
                lease.getAddress().getId(),
                lease.getCompanyId(),
                companyName,
                lease.isCompanyLease(),
                lease.getLandlord().getId(),
                lease.getTenant() == null ? null : lease.getTenant().getId(),
                lease.getLandlord().getName(),
                tenantName,
                lease.getAddress().getLabel(),
                Amounts.apiValue(lease.getRentExclCharges()),
                Amounts.apiValue(lease.getCharges()),
                Amounts.apiValue(lease.getTotalArea()),
                Amounts.apiValue(lease.getBusinessArea()),
                proRata == null ? null : Amounts.apiValue(proRata.base()),
                proRata == null ? null : proRata.detail());
    }
}
