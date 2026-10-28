package fr.hkof.homeofficeexpenses.service.template;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.web.dto.TemplateDtos.TemplateVariableDto;

public final class TemplateCatalog {

    private static final Map<String, TemplateVariableDto> RENT_RECEIPT_VARIABLES = new LinkedHashMap<>();
    private static final Map<String, TemplateVariableDto> EXPENSE_STATEMENT_VARIABLES = new LinkedHashMap<>();

    static {
        variable(RENT_RECEIPT_VARIABLES, "bailleur.nom", "Nom du bailleur", true, "Nom du bailleur");
        variable(RENT_RECEIPT_VARIABLES, "bailleur.adresse", "Adresse du bailleur", false, "Adresse du bailleur");
        variable(RENT_RECEIPT_VARIABLES, "locataire.nom", "Nom du locataire", true, "Nom du locataire");
        variable(RENT_RECEIPT_VARIABLES, "locataire.adresse", "Adresse du locataire", false, "Adresse du locataire");
        variable(RENT_RECEIPT_VARIABLES, "logement.adresse", "Adresse du logement", true, "12 rue de la République, 75000 Paris");
        variable(RENT_RECEIPT_VARIABLES, "mois_libelle", "Mois en français", true, "Octobre 2026");
        variable(RENT_RECEIPT_VARIABLES, "periode.debut", "Début de la période", true, "01/10/2026");
        variable(RENT_RECEIPT_VARIABLES, "periode.fin", "Fin de la période", true, "31/10/2026");
        variable(RENT_RECEIPT_VARIABLES, "loyer_hc", "Loyer hors charges formaté", true, "900,00 €");
        variable(RENT_RECEIPT_VARIABLES, "charges", "Provision pour charges formatée", false, "50,00 €");
        variable(RENT_RECEIPT_VARIABLES, "charges_supplementaires", "Section répétée pour chaque charge supplémentaire", false, "—");
        variable(RENT_RECEIPT_VARIABLES, "charges_supplementaires.libelle", "Libellé de la charge supplémentaire", true, "Eau");
        variable(RENT_RECEIPT_VARIABLES, "charges_supplementaires.montant", "Montant de la charge supplémentaire formaté", true, "20,00 €");
        variable(RENT_RECEIPT_VARIABLES, "total", "Total de la quittance formaté", true, "950,00 €");
        variable(RENT_RECEIPT_VARIABLES, "total_en_lettres", "Total en toutes lettres", true, "neuf cent cinquante euros");
        variable(RENT_RECEIPT_VARIABLES, "date_paiement", "Date de paiement", false, "05/10/2026");
        variable(RENT_RECEIPT_VARIABLES, "date_emission", "Date d'émission", true, "01/10/2026");
        variable(RENT_RECEIPT_VARIABLES, "lieu", "Lieu d'émission", true, "Paris");
        variable(RENT_RECEIPT_VARIABLES, "signature", "Signature (image intégrée)", false, "data:image/png;base64,...");

        variable(EXPENSE_STATEMENT_VARIABLES, "societe.raison_sociale", "Raison sociale", true, "HKOF");
        variable(EXPENSE_STATEMENT_VARIABLES, "societe.siren", "SIREN", false, "000 000 000");
        variable(EXPENSE_STATEMENT_VARIABLES, "societe.adresse", "Adresse de la société", false, "12 rue de la République, 75000 Paris");
        variable(EXPENSE_STATEMENT_VARIABLES, "gerant", "Nom du gérant", true, "Gérant");
        variable(EXPENSE_STATEMENT_VARIABLES, "mois_libelle", "Mois en français", true, "Octobre 2026");
        variable(EXPENSE_STATEMENT_VARIABLES, "numero", "Numéro de note", true, "NF-2026-10");
        variable(EXPENSE_STATEMENT_VARIABLES, "lignes", "Section répétée pour chaque frais", true, "—");
        variable(EXPENSE_STATEMENT_VARIABLES, "lignes.poste", "Libellé du poste", true, "Gaz");
        variable(EXPENSE_STATEMENT_VARIABLES, "lignes.fournisseur", "Fournisseur", false, "EDF");
        variable(EXPENSE_STATEMENT_VARIABLES, "lignes.periode", "Période facturée formatée", false, "01/09/2026 au 31/10/2026");
        variable(EXPENSE_STATEMENT_VARIABLES, "lignes.montant_ttc", "Montant TTC formaté", true, "120,00 €");
        variable(EXPENSE_STATEMENT_VARIABLES, "lignes.prorata", "Prorata formaté", true, "35,71 %");
        variable(EXPENSE_STATEMENT_VARIABLES, "lignes.montant_retenu", "Montant retenu formaté", true, "42,85 €");
        variable(EXPENSE_STATEMENT_VARIABLES, "total", "Total retenu formaté", true, "364,96 €");
        variable(EXPENSE_STATEMENT_VARIABLES, "total_en_lettres", "Total en toutes lettres", true, "trois cent soixante-quatre euros et quatre-vingt-seize centimes");
        variable(EXPENSE_STATEMENT_VARIABLES, "base_prorata", "Rappel de la base de prorata", true, "Surface pro 25 m² / 70 m² = 35,71 %");
        variable(EXPENSE_STATEMENT_VARIABLES, "date_emission", "Date d'émission", true, "22/10/2026");
        variable(EXPENSE_STATEMENT_VARIABLES, "lieu", "Lieu d'émission", true, "Paris");
        variable(EXPENSE_STATEMENT_VARIABLES, "complete", "Vrai si le document inclut les annexes", false, "true");
        variable(EXPENSE_STATEMENT_VARIABLES, "signature", "Signature (image intégrée)", false, "data:image/png;base64,...");
    }

    private TemplateCatalog() {
    }

    private static void variable(Map<String, TemplateVariableDto> target, String name, String description,
            boolean required, String example) {
        target.put(name, new TemplateVariableDto(name, description, required, example));
    }

    public static List<TemplateVariableDto> variables(TemplateType type) {
        return List.copyOf(catalog(type).values());
    }

    public static Set<String> allowedNames(TemplateType type) {
        return catalog(type).keySet();
    }

    public static Set<String> requiredNames(TemplateType type) {
        return catalog(type).values().stream()
                .filter(TemplateVariableDto::required)
                .map(TemplateVariableDto::name)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    public static String description(TemplateType type, String name) {
        TemplateVariableDto templateVariable = catalog(type).get(name);
        return templateVariable == null ? null : templateVariable.description();
    }

    private static Map<String, TemplateVariableDto> catalog(TemplateType type) {
        return type == TemplateType.RENT_RECEIPT ? RENT_RECEIPT_VARIABLES : EXPENSE_STATEMENT_VARIABLES;
    }
}
