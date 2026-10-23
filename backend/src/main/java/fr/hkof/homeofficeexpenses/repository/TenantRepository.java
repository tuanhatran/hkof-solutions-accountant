package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Tenant;

public interface TenantRepository extends JpaRepository<Tenant, Long> {

    List<Tenant> findAllByDeletedFalseOrderByNameAsc();

    Optional<Tenant> findByIdAndDeletedFalse(Long id);

    Optional<Tenant> findFirstByDeletedFalseOrderByNameAsc();
}
