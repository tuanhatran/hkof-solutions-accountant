package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import fr.hkof.homeofficeexpenses.domain.Person;

public interface PersonRepository extends JpaRepository<Person, Long> {

    /** Non-employee persons only: landlords, tenants and legacy persons are lease parties. */
    @Query("""
            select p from Person p
            where p.userId = :userId and p.deleted = false and type(p) <> Employee
            order by p.name asc, p.id asc
            """)
    List<Person> findAllNaturalPersons(@Param("userId") Long userId);

    @Query("""
            select p from Person p
            where p.id = :id and p.userId = :userId and p.deleted = false and type(p) <> Employee
            """)
    Optional<Person> findNaturalPersonById(@Param("id") Long id, @Param("userId") Long userId);

    Optional<Person> findByIdAndUserId(Long id, Long userId);

    Optional<Person> findByIdAndUserIdAndDeletedFalse(Long id, Long userId);

    boolean existsByIdAndUserIdAndDeletedFalse(Long id, Long userId);
}
