package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Settings;
import fr.hkof.homeofficeexpenses.repository.SettingsRepository;
import fr.hkof.homeofficeexpenses.web.dto.SettingsDtos.SettingsDto;
import fr.hkof.homeofficeexpenses.web.dto.SettingsDtos.SettingsRequest;

@Service
public class SettingsService {

    private final SettingsRepository repository;
    private final Clock clock;

    public SettingsService(SettingsRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public SettingsDto get() {
        return toDto(entity());
    }

    @Transactional
    public SettingsDto update(SettingsRequest request) {
        Settings settings = entity();
        settings.setCompanyName(clean(request.companyName()));
        settings.setLegalForm(clean(request.legalForm()));
        settings.setSiren(clean(request.siren()));
        settings.setCompanyAddress(clean(request.companyAddress()));
        settings.setManagerName(clean(request.managerName()));
        settings.setHomeAddress(clean(request.homeAddress()));
        settings.setTotalArea(Amounts.optionalDecimal(request.totalArea(), "surface totale"));
        settings.setBusinessArea(Amounts.optionalDecimal(request.businessArea(), "surface professionnelle"));
        settings.setIssuePlace(clean(request.issuePlace()));
        if (settings.getTotalArea() != null && settings.getBusinessArea() != null) {
            CalculationService.proRataBase(settings.getBusinessArea(), settings.getTotalArea());
        }
        settings.setUpdatedAt(Instant.now(clock));
        return toDto(repository.save(settings));
    }

    @Transactional(readOnly = true)
    public Settings entity() {
        return repository.findById(1L)
                .orElseThrow(() -> new NotFoundException("Paramètres introuvables. Redémarrez l'application pour les initialiser."));
    }

    public SettingsDto toDto(Settings settings) {
        BigDecimal proRataBase = CalculationService.proRataBase(settings.getBusinessArea(), settings.getTotalArea());
        return new SettingsDto(
                settings.getId(),
                settings.getCompanyName(),
                settings.getLegalForm(),
                settings.getSiren(),
                settings.getCompanyAddress(),
                settings.getManagerName(),
                settings.getHomeAddress(),
                Amounts.apiValue(settings.getTotalArea()),
                Amounts.apiValue(settings.getBusinessArea()),
                Amounts.apiValue(proRataBase),
                proRataDetail(settings, proRataBase),
                settings.getIssuePlace());
    }

    public String proRataDetail(Settings settings, BigDecimal proRataBase) {
        if (settings.getBusinessArea() == null || settings.getTotalArea() == null) {
            return "Surfaces non configurées";
        }
        return "Surface pro %s m² / %s m² = %s".formatted(
                Amounts.apiValue(settings.getBusinessArea()).replace(".", ","),
                Amounts.apiValue(settings.getTotalArea()).replace(".", ","),
                Amounts.formatPercentage(proRataBase));
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }
}
