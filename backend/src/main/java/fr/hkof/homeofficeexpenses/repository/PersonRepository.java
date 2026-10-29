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
            where user_id = :userId and kind = 'PERSON' and deleted = false
            order by name asc, id asc
            """, nativeQuery = true)
    List<Person> findAllNaturalPersons(@Param("userId") Long userId);

    @Query(value = """
            select * from person
            where id = :id and user_id = :userId and kind = 'PERSON' and deleted = false
            """, nativeQuery = true)
    Optional<Person> findNaturalPersonById(@Param("id") Long id, @Param("userId") Long userId);

    Optional<Person> findByIdAndUserId(Long id, Long userId);

    Optional<Person> findByIdAndUserIdAndDeletedFalse(Long id, Long userId);

    boolean existsByIdAndUserIdAndDeletedFalse(Long id, Long userId);
}
