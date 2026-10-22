package fr.hkof.fraisocc.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.fraisocc.domain.LlmConfig;

public interface LlmConfigRepository extends JpaRepository<LlmConfig, Long> {
}
