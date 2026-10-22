package fr.hkof.homeofficeexpenses.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Settings;

public interface SettingsRepository extends JpaRepository<Settings, Long> {
}
