package fr.hkof.homeofficeexpenses.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.LeaseTenant;

public interface LeaseTenantRepository extends JpaRepository<LeaseTenant, Long> {

    List<LeaseTenant> findAllByLeaseIdOrderByIdAsc(Long leaseId);

    boolean existsByLeaseIdAndPersonId(Long leaseId, Long personId);

    /** True when the person is still attached to an active lease as a tenant. */
    boolean existsByPersonIdAndLeaseDeletedFalse(Long personId);
}
