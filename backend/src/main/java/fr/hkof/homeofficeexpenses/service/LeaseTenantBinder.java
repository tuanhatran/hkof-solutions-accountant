package fr.hkof.homeofficeexpenses.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Component;

import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.LeaseTenant;
import fr.hkof.homeofficeexpenses.domain.Person;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.PersonRepository;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LeaseRequest;

/**
 * Validates the natural-person tenants of a lease request and links them to the lease.
 * The requested {@code tenantId} stays the primary tenant, the other {@code tenantIds}
 * follow in request order, and the legacy {@code lease.tenant_id} column mirrors it.
 */
@Component
public class LeaseTenantBinder {

    private static final String TENANT_REQUIRED = "Sélectionnez un locataire.";

    private final PersonRepository persons;
    private final EmployeeRepository employees;
    private final OwnershipContext ownership;

    public LeaseTenantBinder(PersonRepository persons, EmployeeRepository employees, OwnershipContext ownership) {
        this.persons = persons;
        this.employees = employees;
        this.ownership = ownership;
    }

    /** Links the requested tenants to the lease; returns them primary first, empty for a company lease. */
    public List<Person> bind(Lease lease, LeaseRequest request, Person landlord) {
        if (Boolean.TRUE.equals(request.companyLease())) {
            boolean hasPersonTenant = request.tenantId() != null
                    || (request.tenantIds() != null && !request.tenantIds().isEmpty());
            if (hasPersonTenant) {
                throw new BusinessException("LEASE_COMPANY_TENANT_INVALID",
                        "Un bail société ne comporte pas de locataire personne physique.");
            }
            lease.getTenants().clear();
            return List.of();
        }
        List<Person> tenants = new ArrayList<>();
        for (Long id : orderedIds(request)) {
            Person tenant = party(id);
            if (tenant.getId().equals(landlord.getId())) {
                throw new BusinessException("LEASE_PARTIES_IDENTICAL",
                        "Le bailleur et le locataire doivent être deux personnes distinctes.");
            }
            tenants.add(tenant);
        }
        lease.getTenants().clear();
        for (int index = 0; index < tenants.size(); index++) {
            LeaseTenant link = new LeaseTenant();
            link.setLease(lease);
            link.setPerson(tenants.get(index));
            link.setPrimary(index == 0);
            lease.getTenants().add(link);
        }
        return tenants;
    }

    /** Requested tenant ids, primary first; the legacy tenantId-only payload stays valid. */
    private List<Long> orderedIds(LeaseRequest request) {
        List<Long> requested = request.tenantIds();
        if (requested == null || requested.isEmpty()) {
            if (request.tenantId() == null) {
                throw new BusinessException("LEASE_TENANT_REQUIRED", TENANT_REQUIRED);
            }
            return List.of(request.tenantId());
        }
        if (requested.stream().anyMatch(Objects::isNull)) {
            throw new BusinessException("LEASE_TENANT_REQUIRED", TENANT_REQUIRED);
        }
        if (new LinkedHashSet<>(requested).size() != requested.size()) {
            throw new BusinessException("LEASE_TENANT_DUPLICATE",
                    "Un locataire ne peut être sélectionné qu'une seule fois.");
        }
        Long primaryId = request.tenantId();
        if (primaryId != null && !requested.contains(primaryId)) {
            throw new BusinessException("LEASE_PRIMARY_TENANT_INVALID",
                    "Le locataire principal doit figurer parmi les locataires du bail.");
        }
        List<Long> ordered = new ArrayList<>();
        if (primaryId != null) {
            ordered.add(primaryId);
        }
        requested.stream().filter(id -> !id.equals(primaryId)).forEach(ordered::add);
        return ordered;
    }

    private Person party(Long id) {
        Long owner = ownership.currentUserId();
        if (employees.existsByIdAndUserIdAndDeletedFalse(id, owner)) {
            throw new BusinessException("LEASE_EMPLOYEE_PARTY", "Un salarié ne peut pas être partie à un bail.");
        }
        return persons.findNaturalPersonById(id, owner)
                .orElseThrow(() -> new NotFoundException("PERSON_NOT_FOUND", "Locataire introuvable."));
    }

    /**
     * Linked natural-person tenants, primary first then by person id; empty for a company
     * lease. Leases created before multi-tenant leases fall back to {@code lease.tenant_id}.
     */
    public static List<Person> personsOf(Lease lease) {
        if (lease == null) {
            return List.of();
        }
        if (!lease.getTenants().isEmpty()) {
            return lease.getTenants().stream()
                    .sorted(Comparator.comparing((LeaseTenant link) -> link.isPrimary()).reversed()
                            .thenComparing(link -> link.getPerson().getId()))
                    .map(LeaseTenant::getPerson)
                    .toList();
        }
        return lease.getTenant() == null ? List.of() : List.of(lease.getTenant());
    }
}
