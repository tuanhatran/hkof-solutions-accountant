package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import fr.hkof.homeofficeexpenses.domain.Person;

public interface PersonRepository extends JpaRepository<Person, Long> {

    /** Natural persons only: employees share the table but are never lease parties. */
    @Query(value = """
            select * from person
            where kind = 'PERSON' and deleted = false
            order by name asc, id asc
            """, nativeQuery = true)
    List<Person> findAllNaturalPersons();

    @Query(value = """
            select * from person
            where id = :id and kind = 'PERSON' and deleted = false
            """, nativeQuery = true)
    Optional<Person> findNaturalPersonById(@Param("id") Long id);

    Optional<Person> findByIdAndDeletedFalse(Long id);

    boolean existsByIdAndDeletedFalse(Long id);
}
