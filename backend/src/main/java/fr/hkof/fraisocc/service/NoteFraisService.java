package fr.hkof.fraisocc.service;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.fraisocc.domain.Justificatif;
import fr.hkof.fraisocc.domain.LigneFrais;
import fr.hkof.fraisocc.domain.NoteFrais;
import fr.hkof.fraisocc.domain.Parametres;
import fr.hkof.fraisocc.domain.Poste;
import fr.hkof.fraisocc.domain.Quittance;
import fr.hkof.fraisocc.domain.SourceMontant;
import fr.hkof.fraisocc.domain.StatutDocument;
import fr.hkof.fraisocc.domain.TemplateDocument;
import fr.hkof.fraisocc.domain.TypeTemplate;
import fr.hkof.fraisocc.repository.NoteFraisRepository;
import fr.hkof.fraisocc.service.extraction.DocumentTextExtractor;
import fr.hkof.fraisocc.service.template.TemplateDataService;
import fr.hkof.fraisocc.service.template.TemplateService;
import fr.hkof.fraisocc.web.dto.Dtos.BrouillonDto;
import fr.hkof.fraisocc.web.dto.Dtos.CalculResponse;
import fr.hkof.fraisocc.web.dto.Dtos.LigneDto;
import fr.hkof.fraisocc.web.dto.Dtos.LigneRequest;
import fr.hkof.fraisocc.web.dto.Dtos.NoteApercuRequest;
import fr.hkof.fraisocc.web.dto.Dtos.NoteCalculRequest;
import fr.hkof.fraisocc.web.dto.Dtos.NoteDto;
import fr.hkof.fraisocc.web.dto.Dtos.NoteGenerationRequest;

@Service
public class NoteFraisService {

    private static final List<String> CONFIANCE = List.of("haute", "moyenne", "basse");

    private final NoteFraisRepository repository;
    private final ParametresService parametresService;
    private final PosteService posteService;
    private final QuittanceService quittanceService;
    private final JustificatifService justificatifService;
    private final TemplateService templateService;
    private final TemplateDataService templateDataService;
    private final PdfService pdfService;
    private final StockageService stockage;
    private final DocumentTextExtractor extracteur;
    private final Clock clock;

    public NoteFraisService(NoteFraisRepository repository, ParametresService parametresService,
            PosteService posteService, QuittanceService quittanceService, JustificatifService justificatifService,
            TemplateService templateService, TemplateDataService templateDataService, PdfService pdfService,
            StockageService stockage, DocumentTextExtractor extracteur, Clock clock) {
        this.repository = repository;
        this.parametresService = parametresService;
        this.posteService = posteService;
        this.quittanceService = quittanceService;
        this.justificatifService = justificatifService;
        this.templateService = templateService;
        this.templateDataService = templateDataService;
        this.pdfService = pdfService;
        this.stockage = stockage;
        this.extracteur = extracteur;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public CalculResponse calculer(NoteCalculRequest request) {
        YearMonth mois = Montants.mois(request.mois());
        List<LigneCalculee> lignes = calculerLignes(request.lignes(), mois);
        Parametres p = parametresService.entite();
        BigDecimal total = CalculService.total(lignes.stream().map(LigneCalculee::montantRetenu).toList());
        return new CalculResponse(
                lignes.stream().map(this::versDto).toList(),
                Montants.valeurApi(total),
                NombreEnLettres.enLettres(total),
                Montants.valeurApi(CalculService.prorataBase(p.getSurfacePro(), p.getSurfaceTotale())),
                templateDataService.detailProrata(p));
    }

    @Transactional(readOnly = true)
    public BrouillonDto brouillon(String moisTexte) {
        YearMonth mois = Montants.mois(moisTexte);
        Parametres p = parametresService.entite();
        Quittance quittance = quittanceService.activePourMois(mois.toString());
        List<LigneDto> lignes = new ArrayList<>();
        if (quittance != null) {
            Poste loyer = posteService.entite("loyer");
            lignes.add(new LigneDto(
                    null, loyer.getCode(), loyer.getLibelle(), loyer.getFournisseur(), null, null,
                    Montants.valeurApi(quittance.getTotal()),
                    Montants.valeurApi(quittance.getTotal()),
                    "100.00",
                    Montants.valeurApi(quittance.getTotal()),
                    null, null, SourceMontant.MANUEL.name(), null, null));
        }
        List<String> manquants = posteService.lister(false).stream()
                .filter(poste -> !poste.code().equals("loyer"))
                .map(poste -> poste.libelle().toLowerCase(Locale.FRENCH))
                .toList();
        return new BrouillonDto(
                mois.toString(),
                quittance == null ? null : quittanceService.versDto(quittance),
                lignes,
                Montants.valeurApi(CalculService.prorataBase(p.getSurfacePro(), p.getSurfaceTotale())),
                templateDataService.detailProrata(p),
                manquants);
    }

    @Transactional(readOnly = true)
    public byte[] apercu(NoteApercuRequest request) {
        YearMonth mois = Montants.mois(request.mois());
        List<LigneCalculee> lignes = calculerLignes(request.lignes(), mois);
        Parametres p = parametresService.entite();
        NoteFrais note = construireNote(mois, lignes, null, null);
        boolean complete = Boolean.TRUE.equals(request.complet());
        TemplateDocument template = templatePourNote(request.templateId());
        String html = templateService.rendre(template, templateDataService.donneesNote(p, note, complete));
        byte[] pdf = pdfService.rendreHtmlEnPdf(html);
        if (complete) {
            pdf = pdfService.fusionner(avecAnnexes(pdf, note, mois));
        }
        return pdfService.ajouterFiligrane(pdf);
    }

    @Transactional
    public NoteDto generer(NoteGenerationRequest request) {
        YearMonth mois = Montants.mois(request.mois());
        List<LigneCalculee> lignes = calculerLignes(request.lignes(), mois);
        if (lignes.isEmpty()) {
            throw new BusinessException("Ajoutez au moins un frais avant de générer la note.");
        }
        Parametres p = parametresService.entite();
        TemplateDocument template = templatePourNote(request.templateId());
        int version = repository.findFirstByMoisOrderByVersionDesc(mois.toString())
                .map(n -> n.getVersion() + 1)
                .orElse(1);
        archiver(mois.toString());
        NoteFrais note = construireNote(mois, lignes, version, template);
        String html = templateService.rendre(template, templateDataService.donneesNote(p, note, true));
        byte[] pdf = pdfService.rendreHtmlEnPdf(html);
        byte[] pdfComplet = pdfService.fusionner(avecAnnexes(pdf, note, mois));
        note.setCheminPdf(stockage.stockerPdf("note_frais_" + mois + "_v" + version + ".pdf", pdf));
        note.setCheminPdfComplet(stockage.stockerPdf("note_frais_" + mois + "_v" + version + "_complet.pdf", pdfComplet));
        NoteFrais enregistree = repository.saveAndFlush(note);
        return versDto(enregistree);
    }

    @Transactional(readOnly = true)
    public List<NoteDto> lister(String mois) {
        List<NoteFrais> notes = mois == null || mois.isBlank()
                ? repository.findAllByOrderByMoisDescVersionDesc()
                : repository.findByMoisOrderByVersionDesc(Montants.mois(mois).toString());
        return notes.stream().map(this::versDto).toList();
    }

    @Transactional(readOnly = true)
    public NoteDto obtenir(Long id) {
        return versDto(entite(id));
    }

    @Transactional(readOnly = true)
    public NoteFrais entite(Long id) {
        return repository.findWithLignesById(id)
                .orElseThrow(() -> new NotFoundException("Note de frais introuvable."));
    }

    @Transactional(readOnly = true)
    public NoteFrais activePourMois(String mois) {
        return repository.findFirstByMoisAndStatutOrderByVersionDesc(mois, StatutDocument.ACTIVE).orElse(null);
    }

    public byte[] pdf(Long id, boolean complet) {
        NoteFrais note = entite(id);
        String chemin = complet ? note.getCheminPdfComplet() : note.getCheminPdf();
        if (chemin == null) {
            throw new NotFoundException("Le PDF demandé est introuvable.");
        }
        return stockage.lire(chemin);
    }

    private List<LigneCalculee> calculerLignes(List<LigneRequest> demandes, YearMonth mois) {
        if (demandes == null || demandes.isEmpty()) {
            return List.of();
        }
        List<LigneCalculee> resultat = new ArrayList<>();
        Set<String> codes = new HashSet<>();
        for (LigneRequest demande : demandes) {
            if (demande.posteCode() == null || demande.posteCode().isBlank()) {
                throw new BusinessException("Le type de frais est obligatoire.");
            }
            Poste poste = posteService.entite(demande.posteCode());
            if (!poste.isPlusieursLignesAutorisees() && !codes.add(poste.getCode())) {
                throw new BusinessException("Le type « " + poste.getLibelle() + " » ne peut être ajouté qu'une fois.");
            }
            BigDecimal montantTtc = Montants.decimal(demande.montantTtc(), "montant TTC", true);
            BigDecimal prorata = Montants.pourcentage(demande.prorataPct());
            LocalDate debut = Montants.dateOptionnelle(demande.periodeDebut(), "début de période");
            LocalDate fin = Montants.dateOptionnelle(demande.periodeFin(), "fin de période");
            if ((debut == null) != (fin == null)) {
                throw new BusinessException("Renseignez les deux dates de la période facturée, ou aucune.");
            }
            BigDecimal montantMois = demande.montantMoisSurcharge() == null || demande.montantMoisSurcharge().isBlank()
                    ? CalculService.ventilerSurMois(montantTtc, debut, fin, mois)
                    : Montants.decimal(demande.montantMoisSurcharge(), "montant du mois", false);
            BigDecimal retenu = CalculService.montantRetenu(montantMois, prorata);
            Justificatif justificatif = demande.justificatifId() == null
                    ? null
                    : justificatifService.entite(demande.justificatifId());
            SourceMontant source = sourceMontant(demande.sourceMontant());
            BigDecimal montantDetecte = Montants.decimalOptionnel(demande.montantDetecteIa(), "montant détecté par IA");
            String confiance = confiance(demande.confianceIa());
            resultat.add(new LigneCalculee(poste, montantTtc, debut, fin, montantMois, prorata, retenu,
                    justificatif, source, montantDetecte, confiance));
        }
        return resultat;
    }

    private NoteFrais construireNote(YearMonth mois, List<LigneCalculee> lignes, Integer version,
            TemplateDocument template) {
        NoteFrais note = new NoteFrais();
        note.setMois(mois.toString());
        note.setNumero("NF-" + mois);
        note.setVersion(version == null ? 1 : version);
        note.setStatut(StatutDocument.ACTIVE);
        if (template != null) {
            note.setTemplateId(template.getId());
            note.setTemplateNom(template.getNom());
            note.setTemplateVersion(template.getVersion());
        }
        note.setCreatedAt(Instant.now(clock));
        BigDecimal total = BigDecimal.ZERO;
        for (LigneCalculee calculee : lignes) {
            LigneFrais ligne = new LigneFrais();
            ligne.setPoste(calculee.poste());
            ligne.setMontantTtc(calculee.montantTtc());
            ligne.setPeriodeDebut(calculee.debut());
            ligne.setPeriodeFin(calculee.fin());
            ligne.setMontantMois(calculee.montantMois());
            ligne.setProrataPct(calculee.prorata());
            ligne.setMontantRetenu(calculee.montantRetenu());
            ligne.setJustificatif(calculee.justificatif());
            ligne.setSourceMontant(calculee.source());
            ligne.setMontantDetecteIa(calculee.montantDetecte());
            ligne.setConfianceIa(calculee.confiance());
            ligne.setLibelleSnapshot(calculee.poste().getLibelle());
            ligne.setFournisseurSnapshot(calculee.poste().getFournisseur());
            note.ajouterLigne(ligne);
            total = total.add(calculee.montantRetenu());
        }
        note.setTotal(total.setScale(2, java.math.RoundingMode.HALF_UP));
        return note;
    }

    private List<byte[]> avecAnnexes(byte[] notePdf, NoteFrais note, YearMonth mois) {
        List<byte[]> pdfs = new ArrayList<>();
        pdfs.add(notePdf);
        Quittance quittance = quittanceService.activePourMois(mois.toString());
        if (quittance != null && quittance.getCheminPdf() != null) {
            pdfs.add(stockage.lire(quittance.getCheminPdf()));
        }
        Set<Long> deja = new HashSet<>();
        for (LigneFrais ligne : note.getLignes()) {
            Justificatif justificatif = ligne.getJustificatif();
            if (justificatif == null || !deja.add(justificatif.getId())) {
                continue;
            }
            byte[] contenu = stockage.lire(justificatif.getChemin());
            if (justificatif.getTypeMime().equals("application/pdf")) {
                pdfs.add(contenu);
            } else if (justificatif.getTypeMime().startsWith("image/")) {
                pdfs.add(pdfService.imageVersPdf(contenu, justificatif.getNomFichier()));
            } else {
                DocumentTextExtractor.Extraction extraction = extracteur.extraire(
                        Path.of(stockage.cheminTemporaire(justificatif.getNomFichier(), contenu)),
                        justificatif.getTypeMime(), 1);
                pdfs.add(pdfService.pageTexte("Justificatif — " + justificatif.getNomFichier(), extraction.texte()));
            }
        }
        return pdfs;
    }

    private TemplateDocument templatePourNote(Long templateId) {
        TemplateDocument template = templateId == null
                ? templateService.actif(TypeTemplate.NOTE_FRAIS)
                : templateService.parId(templateId);
        if (template.getType() != TypeTemplate.NOTE_FRAIS) {
            throw new BusinessException("Le template sélectionné n'est pas un template de note de frais.");
        }
        return template;
    }

    private void archiver(String mois) {
        List<NoteFrais> existantes = repository.findByMoisOrderByVersionDesc(mois);
        boolean modifie = false;
        for (NoteFrais existante : existantes) {
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

    private SourceMontant sourceMontant(String valeur) {
        if (valeur == null || valeur.isBlank()) {
            return SourceMontant.MANUEL;
        }
        try {
            return SourceMontant.valueOf(valeur.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Source de montant invalide : " + valeur);
        }
    }

    private String confiance(String valeur) {
        if (valeur == null || valeur.isBlank()) {
            return null;
        }
        String normalisee = valeur.trim().toLowerCase(Locale.ROOT);
        if (!CONFIANCE.contains(normalisee)) {
            throw new BusinessException("Niveau de confiance IA invalide : " + valeur);
        }
        return normalisee;
    }

    public LigneDto versDto(LigneCalculee ligne) {
        return new LigneDto(
                null,
                ligne.poste().getCode(),
                ligne.poste().getLibelle(),
                ligne.poste().getFournisseur(),
                ligne.debut(),
                ligne.fin(),
                Montants.valeurApi(ligne.montantTtc()),
                Montants.valeurApi(ligne.montantMois()),
                Montants.valeurApi(ligne.prorata()),
                Montants.valeurApi(ligne.montantRetenu()),
                ligne.justificatif() == null ? null : ligne.justificatif().getId(),
                ligne.justificatif() == null ? null : ligne.justificatif().getNomFichier(),
                ligne.source().name(),
                Montants.valeurApi(ligne.montantDetecte()),
                ligne.confiance());
    }

    public NoteDto versDto(NoteFrais note) {
        List<LigneDto> lignes = note.getLignes().stream()
                .map(ligne -> new LigneDto(
                        ligne.getId(),
                        ligne.getPoste().getCode(),
                        ligne.getPoste().getLibelle(),
                        ligne.getPoste().getFournisseur(),
                        ligne.getPeriodeDebut(),
                        ligne.getPeriodeFin(),
                        Montants.valeurApi(ligne.getMontantTtc()),
                        Montants.valeurApi(ligne.getMontantMois()),
                        Montants.valeurApi(ligne.getProrataPct()),
                        Montants.valeurApi(ligne.getMontantRetenu()),
                        ligne.getJustificatif() == null ? null : ligne.getJustificatif().getId(),
                        ligne.getJustificatif() == null ? null : ligne.getJustificatif().getNomFichier(),
                        ligne.getSourceMontant().name(),
                        Montants.valeurApi(ligne.getMontantDetecteIa()),
                        ligne.getConfianceIa()))
                .toList();
        return new NoteDto(
                note.getId(),
                note.getMois(),
                note.getNumero(),
                Montants.valeurApi(note.getTotal()),
                note.getVersion(),
                note.getStatut().name(),
                note.getTemplateId(),
                note.getTemplateNom(),
                note.getTemplateVersion(),
                note.getCreatedAt(),
                lignes,
                note.getCheminPdf() != null,
                note.getCheminPdfComplet() != null);
    }

    private record LigneCalculee(
            Poste poste,
            BigDecimal montantTtc,
            LocalDate debut,
            LocalDate fin,
            BigDecimal montantMois,
            BigDecimal prorata,
            BigDecimal montantRetenu,
            Justificatif justificatif,
            SourceMontant source,
            BigDecimal montantDetecte,
            String confiance) {
    }
}
