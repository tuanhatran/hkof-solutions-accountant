package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Parametres;
import fr.hkof.homeofficeexpenses.repository.ParametresRepository;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.ParametresDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.ParametresRequest;

@Service
public class ParametresService {

    private final ParametresRepository repository;
    private final Clock clock;

    public ParametresService(ParametresRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ParametresDto obtenir() {
        return versDto(entite());
    }

    @Transactional
    public ParametresDto mettreAJour(ParametresRequest request) {
        Parametres parametres = entite();
        parametres.setRaisonSociale(nettoyer(request.raisonSociale()));
        parametres.setFormeJuridique(nettoyer(request.formeJuridique()));
        parametres.setSiren(nettoyer(request.siren()));
        parametres.setSocieteAdresse(nettoyer(request.societeAdresse()));
        parametres.setGerant(nettoyer(request.gerant()));
        parametres.setLogementAdresse(nettoyer(request.logementAdresse()));
        parametres.setSurfaceTotale(Montants.decimalOptionnel(request.surfaceTotale(), "surface totale"));
        parametres.setSurfacePro(Montants.decimalOptionnel(request.surfacePro(), "surface professionnelle"));
        parametres.setBailleurNom(nettoyer(request.bailleurNom()));
        parametres.setBailleurAdresse(nettoyer(request.bailleurAdresse()));
        parametres.setLocataireNom(nettoyer(request.locataireNom()));
        parametres.setLocataireAdresse(nettoyer(request.locataireAdresse()));
        parametres.setLoyerHc(Montants.decimalOptionnel(request.loyerHc(), "loyer hors charges"));
        parametres.setProvisionCharges(Montants.decimalOptionnel(request.provisionCharges(), "provision pour charges"));
        parametres.setLieuEmission(nettoyer(request.lieuEmission()));
        if (parametres.getSurfaceTotale() != null && parametres.getSurfacePro() != null) {
            CalculService.prorataBase(parametres.getSurfacePro(), parametres.getSurfaceTotale());
        }
        parametres.setUpdatedAt(Instant.now(clock));
        return versDto(repository.save(parametres));
    }

    @Transactional(readOnly = true)
    public Parametres entite() {
        return repository.findById(1L)
                .orElseThrow(() -> new NotFoundException("Paramètres introuvables. Redémarrez l'application pour les initialiser."));
    }

    public ParametresDto versDto(Parametres p) {
        BigDecimal prorata = CalculService.prorataBase(p.getSurfacePro(), p.getSurfaceTotale());
        return new ParametresDto(
                p.getId(),
                p.getRaisonSociale(),
                p.getFormeJuridique(),
                p.getSiren(),
                p.getSocieteAdresse(),
                p.getGerant(),
                p.getLogementAdresse(),
                Montants.valeurApi(p.getSurfaceTotale()),
                Montants.valeurApi(p.getSurfacePro()),
                Montants.valeurApi(prorata),
                detailProrata(p, prorata),
                p.getBailleurNom(),
                p.getBailleurAdresse(),
                p.getLocataireNom(),
                p.getLocataireAdresse(),
                Montants.valeurApi(p.getLoyerHc()),
                Montants.valeurApi(p.getProvisionCharges()),
                p.getLieuEmission());
    }

    public String detailProrata(Parametres p, BigDecimal prorata) {
        if (p.getSurfacePro() == null || p.getSurfaceTotale() == null) {
            return "Surfaces non configurées";
        }
        return "Surface pro %s m² / %s m² = %s".formatted(
                Montants.valeurApi(p.getSurfacePro()).replace(".", ","),
                Montants.valeurApi(p.getSurfaceTotale()).replace(".", ","),
                Montants.formatPourcentage(prorata));
    }

    private String nettoyer(String valeur) {
        return valeur == null ? null : valeur.trim();
    }
}
