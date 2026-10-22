package fr.hkof.fraisocc.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.fraisocc.domain.Parametres;
import fr.hkof.fraisocc.domain.Quittance;
import fr.hkof.fraisocc.domain.StatutDocument;
import fr.hkof.fraisocc.domain.TemplateDocument;
import fr.hkof.fraisocc.domain.TypeTemplate;
import fr.hkof.fraisocc.repository.QuittanceRepository;
import fr.hkof.fraisocc.service.template.TemplateDataService;
import fr.hkof.fraisocc.service.template.TemplateService;
import fr.hkof.fraisocc.web.dto.Dtos.QuittanceDto;
import fr.hkof.fraisocc.web.dto.Dtos.QuittanceRequest;

@Service
public class QuittanceService {

    private final QuittanceRepository repository;
    private final ParametresService parametresService;
    private final TemplateService templateService;
    private final TemplateDataService templateDataService;
    private final PdfService pdfService;
    private final StockageService stockage;
    private final Clock clock;

    public QuittanceService(QuittanceRepository repository, ParametresService parametresService,
            TemplateService templateService, TemplateDataService templateDataService, PdfService pdfService,
            StockageService stockage, Clock clock) {
        this.repository = repository;
        this.parametresService = parametresService;
        this.templateService = templateService;
        this.templateDataService = templateDataService;
        this.pdfService = pdfService;
        this.stockage = stockage;
        this.clock = clock;
    }

    @Transactional
    public QuittanceDto generer(QuittanceRequest request) {
        YearMonth mois = Montants.mois(request.mois());
        Parametres parametres = parametresService.entite();
        LocalDate debut = dateOu(request.periodeDebut(), mois.atDay(1));
        LocalDate fin = dateOu(request.periodeFin(), mois.atEndOfMonth());
        if (fin.isBefore(debut)) {
            throw new BusinessException("La fin de période ne peut pas précéder le début.");
        }
        BigDecimal loyer = request.loyerHc() == null || request.loyerHc().isBlank()
                ? parametres.getLoyerHc()
                : Montants.decimal(request.loyerHc(), "loyer hors charges", false);
        if (loyer == null) {
            throw new BusinessException("Renseignez le loyer hors charges dans la configuration.");
        }
        BigDecimal charges = request.charges() == null || request.charges().isBlank()
                ? (parametres.getProvisionCharges() == null ? BigDecimal.ZERO : parametres.getProvisionCharges())
                : Montants.decimal(request.charges(), "provision pour charges", false);
        BigDecimal total = CalculService.totalQuittance(loyer, charges);
        LocalDate emission = dateOu(request.dateEmission(), LocalDate.now(clock));
        LocalDate paiement = dateOu(request.datePaiement(), LocalDate.now(clock));

        TemplateDocument template = templateService.actif(TypeTemplate.QUITTANCE);
        if (request.templateId() != null) {
            template = templateService.parId(request.templateId());
            if (template.getType() != TypeTemplate.QUITTANCE) {
                throw new BusinessException("Le template sélectionné n'est pas un template de quittance.");
            }
        }

        int version = repository.findFirstByMoisOrderByVersionDesc(mois.toString())
                .map(q -> q.getVersion() + 1)
                .orElse(1);
        archiver(mois.toString());

        Quittance quittance = new Quittance();
        quittance.setMois(mois.toString());
        quittance.setPeriodeDebut(debut);
        quittance.setPeriodeFin(fin);
        quittance.setLoyerHc(loyer);
        quittance.setCharges(charges);
        quittance.setTotal(total);
        quittance.setDatePaiement(paiement);
        quittance.setDateEmission(emission);
        quittance.setVersion(version);
        quittance.setStatut(StatutDocument.ACTIVE);
        quittance.setTemplateId(template.getId());
        quittance.setTemplateNom(template.getNom());
        quittance.setTemplateVersion(template.getVersion());
        quittance.setCreatedAt(Instant.now(clock));

        String html = templateService.rendre(template, templateDataService.donneesQuittance(parametres, quittance));
        byte[] pdf = pdfService.rendreHtmlEnPdf(html);
        String chemin = stockage.stockerPdf("quittance_" + mois + "_v" + version + ".pdf", pdf);
        quittance.setCheminPdf(chemin);
        return versDto(repository.save(quittance));
    }

    @Transactional(readOnly = true)
    public byte[] apercu(QuittanceRequest request) {
        YearMonth mois = Montants.mois(request.mois());
        Parametres parametres = parametresService.entite();
        LocalDate debut = dateOu(request.periodeDebut(), mois.atDay(1));
        LocalDate fin = dateOu(request.periodeFin(), mois.atEndOfMonth());
        if (fin.isBefore(debut)) {
            throw new BusinessException("La fin de période ne peut pas précéder le début.");
        }
        BigDecimal loyer = request.loyerHc() == null || request.loyerHc().isBlank()
                ? parametres.getLoyerHc()
                : Montants.decimal(request.loyerHc(), "loyer hors charges", false);
        if (loyer == null) {
            throw new BusinessException("Renseignez le loyer hors charges dans la configuration.");
        }
        BigDecimal charges = request.charges() == null || request.charges().isBlank()
                ? (parametres.getProvisionCharges() == null ? BigDecimal.ZERO : parametres.getProvisionCharges())
                : Montants.decimal(request.charges(), "provision pour charges", false);
        Quittance quittance = new Quittance();
        quittance.setMois(mois.toString());
        quittance.setPeriodeDebut(debut);
        quittance.setPeriodeFin(fin);
        quittance.setLoyerHc(loyer);
        quittance.setCharges(charges);
        quittance.setTotal(CalculService.totalQuittance(loyer, charges));
        quittance.setDateEmission(dateOu(request.dateEmission(), LocalDate.now(clock)));
        quittance.setDatePaiement(dateOu(request.datePaiement(), LocalDate.now(clock)));
        TemplateDocument template = request.templateId() == null
                ? templateService.actif(TypeTemplate.QUITTANCE)
                : templateService.parId(request.templateId());
        if (template.getType() != TypeTemplate.QUITTANCE) {
            throw new BusinessException("Le template sélectionné n'est pas un template de quittance.");
        }
        String html = templateService.rendre(template, templateDataService.donneesQuittance(parametres, quittance));
        return pdfService.ajouterFiligrane(pdfService.rendreHtmlEnPdf(html));
    }

    @Transactional(readOnly = true)
    public List<QuittanceDto> lister(String mois) {
        List<Quittance> quittances = mois == null || mois.isBlank()
                ? repository.findAllByOrderByMoisDescVersionDesc()
                : repository.findByMoisOrderByVersionDesc(Montants.mois(mois).toString());
        return quittances.stream().map(this::versDto).toList();
    }

    @Transactional(readOnly = true)
    public QuittanceDto obtenir(Long id) {
        return versDto(entite(id));
    }

    @Transactional(readOnly = true)
    public Quittance entite(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Quittance introuvable."));
    }

    @Transactional(readOnly = true)
    public Quittance activePourMois(String mois) {
        return repository.findFirstByMoisAndStatutOrderByVersionDesc(mois, StatutDocument.ACTIVE).orElse(null);
    }

    public byte[] pdf(Long id) {
        Quittance quittance = entite(id);
        if (quittance.getCheminPdf() == null) {
            throw new NotFoundException("Le PDF de cette quittance est introuvable.");
        }
        return stockage.lire(quittance.getCheminPdf());
    }

    private void archiver(String mois) {
        List<Quittance> existantes = repository.findByMoisOrderByVersionDesc(mois);
        boolean modifie = false;
        for (Quittance existante : existantes) {
            if (existante.getStatut() == StatutDocument.ACTIVE) {
                existante.setStatut(StatutDocument.ARCHIVEE);
                modifie = true;
            }
        }
        if (modifie) {
            repository.saveAll(existantes);
            repository.flush();
        }
    }

    private LocalDate dateOu(String date, LocalDate defaut) {
        LocalDate parsee = Montants.dateOptionnelle(date, "date");
        return parsee == null ? defaut : parsee;
    }

    public QuittanceDto versDto(Quittance q) {
        return new QuittanceDto(
                q.getId(),
                q.getMois(),
                q.getPeriodeDebut(),
                q.getPeriodeFin(),
                Montants.valeurApi(q.getLoyerHc()),
                Montants.valeurApi(q.getCharges()),
                Montants.valeurApi(q.getTotal()),
                q.getDatePaiement(),
                q.getDateEmission(),
                q.getVersion(),
                q.getStatut().name(),
                q.getTemplateId(),
                q.getTemplateNom(),
                q.getTemplateVersion(),
                q.getCreatedAt(),
                q.getCheminPdf() != null);
    }
}
