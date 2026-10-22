package fr.hkof.fraisocc.service.template;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import fr.hkof.fraisocc.domain.NoteFrais;
import fr.hkof.fraisocc.domain.Parametres;
import fr.hkof.fraisocc.domain.Quittance;
import fr.hkof.fraisocc.service.CalculService;
import fr.hkof.fraisocc.service.Montants;
import fr.hkof.fraisocc.service.NombreEnLettres;
import fr.hkof.fraisocc.service.ParametresService;

@Service
public class TemplateDataService {

    private final ParametresService parametresService;

    public TemplateDataService(ParametresService parametresService) {
        this.parametresService = parametresService;
    }

    public Map<String, Object> donneesQuittance(Parametres p, Quittance quittance) {
        Map<String, Object> donnees = new LinkedHashMap<>();
        donnees.put("bailleur", Map.of(
                "nom", texte(p.getBailleurNom()),
                "adresse", texte(p.getBailleurAdresse())));
        donnees.put("locataire", Map.of(
                "nom", texte(p.getLocataireNom()),
                "adresse", texte(p.getLocataireAdresse())));
        donnees.put("logement", Map.of("adresse", texte(p.getLogementAdresse())));
        donnees.put("mois_libelle", Montants.formatMois(java.time.YearMonth.parse(quittance.getMois())));
        donnees.put("periode", Map.of(
                "debut", Montants.formatDate(quittance.getPeriodeDebut()),
                "fin", Montants.formatDate(quittance.getPeriodeFin())));
        donnees.put("loyer_hc", Montants.formatEUR(quittance.getLoyerHc()));
        donnees.put("charges", Montants.formatEUR(quittance.getCharges()));
        donnees.put("total", Montants.formatEUR(quittance.getTotal()));
        donnees.put("total_en_lettres", NombreEnLettres.enLettres(quittance.getTotal()));
        donnees.put("date_paiement", Montants.formatDate(quittance.getDatePaiement()));
        donnees.put("date_emission", Montants.formatDate(quittance.getDateEmission()));
        donnees.put("lieu", texte(p.getLieuEmission()));
        return donnees;
    }

    public Map<String, Object> donneesNote(Parametres p, NoteFrais note, boolean complete) {
        Map<String, Object> donnees = new LinkedHashMap<>();
        donnees.put("societe", Map.of(
                "raison_sociale", texte(p.getRaisonSociale()),
                "siren", texte(p.getSiren()),
                "adresse", texte(p.getSocieteAdresse())));
        donnees.put("gerant", texte(p.getGerant()));
        donnees.put("mois_libelle", Montants.formatMois(java.time.YearMonth.parse(note.getMois())));
        donnees.put("numero", texte(note.getNumero()));
        List<Map<String, Object>> lignes = new ArrayList<>();
        for (var ligne : note.getLignes()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("poste", ligne.getPoste().getLibelle());
            item.put("fournisseur", texte(ligne.getPoste().getFournisseur()));
            item.put("periode", periode(ligne.getPeriodeDebut(), ligne.getPeriodeFin()));
            item.put("montant_ttc", Montants.formatEUR(ligne.getMontantTtc()));
            item.put("prorata", Montants.formatPourcentage(ligne.getProrataPct()));
            item.put("montant_retenu", Montants.formatEUR(ligne.getMontantRetenu()));
            lignes.add(item);
        }
        donnees.put("lignes", lignes);
        donnees.put("total", Montants.formatEUR(note.getTotal()));
        donnees.put("total_en_lettres", NombreEnLettres.enLettres(note.getTotal()));
        donnees.put("base_prorata", detailProrata(p));
        donnees.put("date_emission", Montants.formatDate(java.time.LocalDate.now()));
        donnees.put("lieu", texte(p.getLieuEmission()));
        donnees.put("complete", complete);
        return donnees;
    }

    public Map<String, Object> donneesExemple(fr.hkof.fraisocc.domain.TypeTemplate type) {
        Parametres p = parametresService.entite();
        if (type == fr.hkof.fraisocc.domain.TypeTemplate.QUITTANCE) {
            Quittance q = new Quittance();
            q.setMois("2026-10");
            q.setPeriodeDebut(java.time.LocalDate.of(2026, 10, 1));
            q.setPeriodeFin(java.time.LocalDate.of(2026, 10, 31));
            q.setLoyerHc(p.getLoyerHc() == null ? new BigDecimal("900.00") : p.getLoyerHc());
            q.setCharges(p.getProvisionCharges() == null ? new BigDecimal("50.00") : p.getProvisionCharges());
            q.setTotal(CalculService.totalQuittance(q.getLoyerHc(), q.getCharges()));
            q.setDatePaiement(java.time.LocalDate.of(2026, 10, 5));
            q.setDateEmission(java.time.LocalDate.of(2026, 10, 1));
            return donneesQuittance(p, q);
        }
        NoteFrais n = new NoteFrais();
        n.setMois("2026-10");
        n.setNumero("NF-2026-10");
        n.setTotal(new BigDecimal("364.96"));
        donneesNoteExemple(p, n, true);
        return donneesNoteExemple(p, n, true);
    }

    private Map<String, Object> donneesNoteExemple(Parametres p, NoteFrais note, boolean complete) {
        Map<String, Object> donnees = new LinkedHashMap<>();
        donnees.put("societe", Map.of(
                "raison_sociale", texte(p.getRaisonSociale()),
                "siren", texte(p.getSiren()),
                "adresse", texte(p.getSocieteAdresse())));
        donnees.put("gerant", texte(p.getGerant()));
        donnees.put("mois_libelle", "Octobre 2026");
        donnees.put("numero", note.getNumero());
        List<Map<String, Object>> lignes = new ArrayList<>();
        lignes.add(ligne("Loyer", "", "01/10/2026 au 31/10/2026", "950,00 €", "100,00 %", "950,00 €"));
        lignes.add(ligne("Gaz", "EDF", "01/09/2026 au 31/10/2026", "120,00 €", "35,71 %", "21,42 €"));
        lignes.add(ligne("Électricité", "Primeo", "01/09/2026 au 31/10/2026", "85,00 €", "35,71 %", "15,18 €"));
        lignes.add(ligne("Téléphone", "Opérateur", "01/10/2026 au 31/10/2026", "29,99 €", "35,71 %", "10,71 €"));
        lignes.add(ligne("Fibre internet", "Opérateur", "01/10/2026 au 31/10/2026", "39,99 €", "35,71 %", "14,28 €"));
        lignes.add(ligne("Assurance habitation", "Assureur", "01/10/2026 au 31/10/2026", "180,00 €", "35,71 %", "64,28 €"));
        donnees.put("lignes", lignes);
        donnees.put("total", "1 075,87 €");
        donnees.put("total_en_lettres", "mille soixante-quinze euros et quatre-vingt-sept centimes");
        donnees.put("base_prorata", detailProrata(p));
        donnees.put("date_emission", Montants.formatDate(java.time.LocalDate.now()));
        donnees.put("lieu", texte(p.getLieuEmission()));
        donnees.put("complete", complete);
        return donnees;
    }

    private Map<String, Object> ligne(String poste, String fournisseur, String periode, String ttc, String prorata,
            String retenu) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("poste", poste);
        item.put("fournisseur", fournisseur);
        item.put("periode", periode);
        item.put("montant_ttc", ttc);
        item.put("prorata", prorata);
        item.put("montant_retenu", retenu);
        return item;
    }

    private String periode(java.time.LocalDate debut, java.time.LocalDate fin) {
        if (debut == null || fin == null) {
            return "";
        }
        return Montants.formatDate(debut) + " au " + Montants.formatDate(fin);
    }

    public String detailProrata(Parametres p) {
        BigDecimal base = CalculService.prorataBase(p.getSurfacePro(), p.getSurfaceTotale());
        return parametresService.detailProrata(p, base);
    }

    private String texte(String valeur) {
        return valeur == null ? "" : valeur;
    }
}
