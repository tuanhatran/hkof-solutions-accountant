package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Settings;
import fr.hkof.homeofficeexpenses.repository.SettingsRepository;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.SettingsDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.SettingsRequest;

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
        Settings parameters = entity();
        parameters.setCompanyName(clean(request.companyName()));
        parameters.setLegalForm(clean(request.legalForm()));
        parameters.setSiren(clean(request.siren()));
        parameters.setCompanyAddress(clean(request.companyAddress()));
        parameters.setManagerName(clean(request.managerName()));
        parameters.setHomeAddress(clean(request.homeAddress()));
        parameters.setTotalArea(Amounts.optionalDecimal(request.totalArea(), "surface totale"));
        parameters.setBusinessArea(Amounts.optionalDecimal(request.businessArea(), "surface professionnelle"));
        parameters.setLandlordName(clean(request.landlordName()));
        parameters.setLandlordAddress(clean(request.landlordAddress()));
        parameters.setTenantName(clean(request.tenantName()));
        parameters.setTenantAddress(clean(request.tenantAddress()));
        parameters.setRentExclCharges(Amounts.optionalDecimal(request.rentExclCharges(), "loyer hors charges"));
        parameters.setChargesAdvance(Amounts.optionalDecimal(request.chargesAdvance(), "provision pour charges"));
        parameters.setIssuePlace(clean(request.issuePlace()));
        if (parameters.getTotalArea() != null && parameters.getBusinessArea() != null) {
            CalculationService.proRataBase(parameters.getBusinessArea(), parameters.getTotalArea());
        }
        parameters.setUpdatedAt(Instant.now(clock));
        return toDto(repository.save(parameters));
    }

    @Transactional(readOnly = true)
    public Settings entity() {
        return repository.findById(1L)
                .orElseThrow(() -> new NotFoundException("Paramètres introuvables. Redémarrez l'application pour les initialiser."));
    }

    public SettingsDto toDto(Settings p) {
        BigDecimal prorata = CalculationService.proRataBase(p.getBusinessArea(), p.getTotalArea());
        return new SettingsDto(
                p.getId(),
                p.getCompanyName(),
                p.getLegalForm(),
                p.getSiren(),
                p.getCompanyAddress(),
                p.getManagerName(),
                p.getHomeAddress(),
                Amounts.apiValue(p.getTotalArea()),
                Amounts.apiValue(p.getBusinessArea()),
                Amounts.apiValue(prorata),
                proRataDetail(p, prorata),
                p.getLandlordName(),
                p.getLandlordAddress(),
                p.getTenantName(),
                p.getTenantAddress(),
                Amounts.apiValue(p.getRentExclCharges()),
                Amounts.apiValue(p.getChargesAdvance()),
                p.getIssuePlace());
    }

    public String proRataDetail(Settings p, BigDecimal prorata) {
        if (p.getBusinessArea() == null || p.getTotalArea() == null) {
            return "Surfaces non configurées";
        }
        return "Surface pro %s m² / %s m² = %s".formatted(
                Amounts.apiValue(p.getBusinessArea()).replace(".", ","),
                Amounts.apiValue(p.getTotalArea()).replace(".", ","),
                Amounts.formatPercentage(prorata));
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }
}
