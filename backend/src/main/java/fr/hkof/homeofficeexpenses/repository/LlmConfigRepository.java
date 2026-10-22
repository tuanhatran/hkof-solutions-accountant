package fr.hkof.homeofficeexpenses.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.LlmConfig;

public interface LlmConfigRepository extends JpaRepository<LlmConfig, Long> {
}
