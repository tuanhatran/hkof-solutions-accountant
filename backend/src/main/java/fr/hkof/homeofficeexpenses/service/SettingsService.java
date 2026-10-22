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
    public SettingsDto obtenir() {
        return versDto(entity());
    }

    @Transactional
    public SettingsDto mettreAJour(SettingsRequest request) {
        Settings parameters = entity();
        parameters.setCompanyName(nettoyer(request.companyName()));
        parameters.setLegalForm(nettoyer(request.legalForm()));
        parameters.setSiren(nettoyer(request.siren()));
        parameters.setCompanyAddress(nettoyer(request.companyAddress()));
        parameters.setManagerName(nettoyer(request.managerName()));
        parameters.setHomeAddress(nettoyer(request.homeAddress()));
        parameters.setTotalArea(Amounts.decimalOptionnel(request.totalArea(), "surface totale"));
        parameters.setBusinessArea(Amounts.decimalOptionnel(request.businessArea(), "surface professionnelle"));
        parameters.setLandlordName(nettoyer(request.landlordName()));
        parameters.setLandlordAddress(nettoyer(request.landlordAddress()));
        parameters.setTenantName(nettoyer(request.tenantName()));
        parameters.setTenantAddress(nettoyer(request.tenantAddress()));
        parameters.setRentExclCharges(Amounts.decimalOptionnel(request.rentExclCharges(), "loyer hors charges"));
        parameters.setChargesAdvance(Amounts.decimalOptionnel(request.chargesAdvance(), "provision pour charges"));
        parameters.setIssuePlace(nettoyer(request.issuePlace()));
        if (parameters.getTotalArea() != null && parameters.getBusinessArea() != null) {
            CalculationService.proRataBase(parameters.getBusinessArea(), parameters.getTotalArea());
        }
        parameters.setUpdatedAt(Instant.now(clock));
        return versDto(repository.save(parameters));
    }

    @Transactional(readOnly = true)
    public Settings entity() {
        return repository.findById(1L)
                .orElseThrow(() -> new NotFoundException("Paramètres introuvables. Redémarrez l'application pour les initialiser."));
    }

    public SettingsDto versDto(Settings p) {
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
                detailProrata(p, prorata),
                p.getLandlordName(),
                p.getLandlordAddress(),
                p.getTenantName(),
                p.getTenantAddress(),
                Amounts.apiValue(p.getRentExclCharges()),
                Amounts.apiValue(p.getChargesAdvance()),
                p.getIssuePlace());
    }

    public String detailProrata(Settings p, BigDecimal prorata) {
        if (p.getBusinessArea() == null || p.getTotalArea() == null) {
            return "Surfaces non configurées";
        }
        return "Surface pro %s m² / %s m² = %s".formatted(
                Amounts.apiValue(p.getBusinessArea()).replace(".", ","),
                Amounts.apiValue(p.getTotalArea()).replace(".", ","),
                Amounts.formatPourcentage(prorata));
    }

    private String nettoyer(String value) {
        return value == null ? null : value.trim();
    }
}
