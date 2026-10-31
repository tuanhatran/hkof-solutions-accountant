package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import fr.hkof.homeofficeexpenses.domain.Tenant;

public interface TenantRepository extends JpaRepository<Tenant, Long> {

    @Query("""
            select t from Tenant t
            where t.userId = :userId and t.deleted = false
            order by t.name asc, t.id asc
            """)
    List<Tenant> findAllByUserId(@Param("userId") Long userId);

    Optional<Tenant> findByIdAndUserIdAndDeletedFalse(Long id, Long userId);
}
