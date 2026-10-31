package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import fr.hkof.homeofficeexpenses.domain.Landlord;

public interface LandlordRepository extends JpaRepository<Landlord, Long> {

    @Query("""
            select l from Landlord l
            where l.userId = :userId and l.deleted = false
            order by l.name asc, l.id asc
            """)
    List<Landlord> findAllByUserId(@Param("userId") Long userId);

    Optional<Landlord> findByIdAndUserIdAndDeletedFalse(Long id, Long userId);
}
