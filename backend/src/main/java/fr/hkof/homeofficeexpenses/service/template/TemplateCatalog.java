package fr.hkof.homeofficeexpenses.service.template;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.TemplateVariableDto;

public final class TemplateCatalog {

    private static final Map<String, TemplateVariableDto> QUITTANCE = new LinkedHashMap<>();
    private static final Map<String, TemplateVariableDto> NOTE = new LinkedHashMap<>();

    static {
        variable(QUITTANCE, "bailleur.nom", "Nom du bailleur", true, "Nom du bailleur");
        variable(QUITTANCE, "bailleur.adresse", "Adresse du bailleur", false, "Adresse du bailleur");
        variable(QUITTANCE, "locataire.nom", "Nom du locataire", true, "Nom du locataire");
        variable(QUITTANCE, "locataire.adresse", "Adresse du locataire", false, "Adresse du locataire");
        variable(QUITTANCE, "logement.adresse", "Adresse du logement", true, "12 rue de la République, 75000 Paris");
        variable(QUITTANCE, "mois_libelle", "Mois en français", true, "Octobre 2026");
        variable(QUITTANCE, "periode.debut", "Début de la période", true, "01/10/2026");
        variable(QUITTANCE, "periode.fin", "Fin de la période", true, "31/10/2026");
        variable(QUITTANCE, "loyer_hc", "Loyer hors charges formaté", true, "900,00 €");
        variable(QUITTANCE, "charges", "Provision pour charges formatée", false, "50,00 €");
        variable(QUITTANCE, "total", "Total de la quittance formaté", true, "950,00 €");
        variable(QUITTANCE, "total_en_lettres", "Total en toutes lettres", true, "neuf cent cinquante euros");
        variable(QUITTANCE, "date_paiement", "Date de paiement", false, "05/10/2026");
        variable(QUITTANCE, "date_emission", "Date d'émission", true, "01/10/2026");
        variable(QUITTANCE, "lieu", "Lieu d'émission", true, "Paris");

        variable(NOTE, "societe.raison_sociale", "Raison sociale", true, "HKOF");
        variable(NOTE, "societe.siren", "SIREN", false, "000 000 000");
        variable(NOTE, "societe.adresse", "Adresse de la société", false, "12 rue de la République, 75000 Paris");
        variable(NOTE, "gerant", "Nom du gérant", true, "Gérant");
        variable(NOTE, "mois_libelle", "Mois en français", true, "Octobre 2026");
        variable(NOTE, "numero", "Numéro de note", true, "NF-2026-10");
        variable(NOTE, "lignes", "Section répétée pour chaque frais", true, "—");
        variable(NOTE, "lignes.poste", "Libellé du poste", true, "Gaz");
        variable(NOTE, "lignes.fournisseur", "Fournisseur", false, "EDF");
        variable(NOTE, "lignes.periode", "Période facturée formatée", false, "01/09/2026 au 31/10/2026");
        variable(NOTE, "lignes.montant_ttc", "Montant TTC formaté", true, "120,00 €");
        variable(NOTE, "lignes.prorata", "Prorata formaté", true, "35,71 %");
        variable(NOTE, "lignes.montant_retenu", "Montant retenu formaté", true, "42,85 €");
        variable(NOTE, "total", "Total retenu formaté", true, "364,96 €");
        variable(NOTE, "total_en_lettres", "Total en toutes lettres", true, "trois cent soixante-quatre euros et quatre-vingt-seize centimes");
        variable(NOTE, "base_prorata", "Rappel de la base de prorata", true, "Surface pro 25 m² / 70 m² = 35,71 %");
        variable(NOTE, "date_emission", "Date d'émission", true, "22/10/2026");
        variable(NOTE, "lieu", "Lieu d'émission", true, "Paris");
        variable(NOTE, "complete", "Vrai si le document inclut les annexes", false, "true");
    }

    private TemplateCatalog() {
    }

    private static void variable(Map<String, TemplateVariableDto> cible, String name, String description,
            boolean required, String example) {
        cible.put(name, new TemplateVariableDto(name, description, required, example));
    }

    public static List<TemplateVariableDto> variables(TemplateType type) {
        return List.copyOf(catalogue(type).values());
    }

    public static Set<String> nomsAllowed(TemplateType type) {
        return catalogue(type).keySet();
    }

    public static Set<String> obligatoires(TemplateType type) {
        return catalogue(type).values().stream()
                .filter(TemplateVariableDto::required)
                .map(TemplateVariableDto::name)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    public static String description(TemplateType type, String name) {
        TemplateVariableDto variable = catalogue(type).get(name);
        return variable == null ? null : variable.description();
    }

    private static Map<String, TemplateVariableDto> catalogue(TemplateType type) {
        return type == TemplateType.QUITTANCE ? QUITTANCE : NOTE;
    }
}
