package fr.hkof.fraisocc.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.fraisocc.domain.Poste;

public interface PosteRepository extends JpaRepository<Poste, Long> {

    List<Poste> findBySupprimeFalseOrderByOrdreAsc();

    List<Poste> findBySupprimeFalseAndActifTrueOrderByOrdreAsc();

    Optional<Poste> findByCodeAndSupprimeFalse(String code);

    Optional<Poste> findFirstByCode(String code);

    boolean existsByCode(String code);
}
