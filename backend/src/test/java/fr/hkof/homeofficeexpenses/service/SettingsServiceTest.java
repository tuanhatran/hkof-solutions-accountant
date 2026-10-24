package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.Settings;
import fr.hkof.homeofficeexpenses.repository.SettingsRepository;
import fr.hkof.homeofficeexpenses.web.dto.SettingsDtos.SettingsDto;
import fr.hkof.homeofficeexpenses.web.dto.SettingsDtos.SettingsRequest;

class SettingsServiceTest {

    private SettingsRepository repository;
    private SettingsService service;

    @BeforeEach
    void setUp() {
        repository = mock(SettingsRepository.class);
        service = new SettingsService(repository, Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private Settings settings() {
        Settings settings = new Settings();
        settings.setId(1L);
        settings.setCompanyName("HKOF");
        settings.setTotalArea(new BigDecimal("70.00"));
        settings.setBusinessArea(new BigDecimal("25.00"));
        settings.setIssuePlace("Paris");
        return settings;
    }

    @Test
    @DisplayName("Reading settings maps the pro-rata base and detail")
    void get() {
        when(repository.findById(1L)).thenReturn(Optional.of(settings()));

        SettingsDto dto = service.get();

        assertThat(dto.proRataBase()).isEqualTo("35.71");
        assertThat(dto.proRataBaseDetail()).contains("Surface pro", "35,71");
    }

    @Test
    @DisplayName("Missing settings are reported in French")
    void missingSettings() {
        when(repository.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get())
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Paramètres introuvables");
    }

    @Test
    @DisplayName("Updating trims text, parses areas and saves")
    void update() {
        Settings settings = settings();
        when(repository.findById(1L)).thenReturn(Optional.of(settings));
        when(repository.save(any(Settings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SettingsDto dto = service.update(new SettingsRequest(
                " HKOF ", null, null, null, null, null, "70", "25", "Paris"));

        assertThat(dto.companyName()).isEqualTo("HKOF");
        assertThat(dto.legalForm()).isNull();
        assertThat(settings.getUpdatedAt()).isNotNull();
        assertThat(dto.proRataBase()).isEqualTo("35.71");
    }

    @Test
    @DisplayName("An inconsistent area pair is rejected before saving")
    void updateRejectsInvalidAreas() {
        when(repository.findById(1L)).thenReturn(Optional.of(settings()));
        assertThatThrownBy(() -> service.update(new SettingsRequest(
                null, null, null, null, null, null, "70", "80", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("surface");
    }

    @Test
    @DisplayName("A missing area renders the non configured detail")
    void proRataDetailWithoutAreas() {
        Settings settings = new Settings();
        assertThat(service.proRataDetail(settings, BigDecimal.ZERO)).isEqualTo("Surfaces non configurées");
    }
}
