package fr.hkof.homeofficeexpenses.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Parametres;

public interface ParametresRepository extends JpaRepository<Parametres, Long> {
}
