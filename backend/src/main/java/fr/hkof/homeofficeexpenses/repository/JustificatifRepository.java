package fr.hkof.homeofficeexpenses.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Justificatif;

public interface JustificatifRepository extends JpaRepository<Justificatif, Long> {
}
