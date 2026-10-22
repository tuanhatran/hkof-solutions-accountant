package fr.hkof.homeofficeexpenses.web.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class Dtos {

    private Dtos() {
    }

    public record ParametresDto(
            Long id,
            String raisonSociale,
            String formeJuridique,
            String siren,
            String societeAdresse,
            String gerant,
            String logementAdresse,
            String surfaceTotale,
            String surfacePro,
            String prorataBase,
            String prorataBaseDetail,
            String bailleurNom,
            String bailleurAdresse,
            String locataireNom,
            String locataireAdresse,
            String loyerHc,
            String provisionCharges,
            String lieuEmission) {
    }

    public record ParametresRequest(
            String raisonSociale,
            String formeJuridique,
            String siren,
            String societeAdresse,
            String gerant,
            String logementAdresse,
            String surfaceTotale,
            String surfacePro,
            String bailleurNom,
            String bailleurAdresse,
            String locataireNom,
            String locataireAdresse,
            String loyerHc,
            String provisionCharges,
            String lieuEmission) {
    }

    public record PosteDto(
            Long id,
            String code,
            String libelle,
            String fournisseur,
            String prorataPct,
            String periodicite,
            boolean actif,
            int ordre,
            boolean plusieursLignesAutorisees) {
    }

    public record PosteRequest(
            String code,
            String libelle,
            String fournisseur,
            String prorataPct,
            String periodicite,
            Boolean actif,
            Integer ordre,
            Boolean plusieursLignesAutorisees) {
    }

    public record QuittanceRequest(
            String mois,
            String periodeDebut,
            String periodeFin,
            String loyerHc,
            String charges,
            String datePaiement,
            String dateEmission,
            Long templateId) {
    }

    public record QuittanceDto(
            Long id,
            String mois,
            LocalDate periodeDebut,
            LocalDate periodeFin,
            String loyerHc,
            String charges,
            String total,
            LocalDate datePaiement,
            LocalDate dateEmission,
            int version,
            String statut,
            Long templateId,
            String templateNom,
            Integer templateVersion,
            Instant createdAt,
            boolean pdfDisponible) {
    }

    public record JustificatifDto(
            Long id,
            String nomFichier,
            String typeMime,
            long taille,
            Instant createdAt) {
    }

    public record LigneRequest(
            String posteCode,
            String montantTtc,
            String prorataPct,
            String periodeDebut,
            String periodeFin,
            String montantMoisSurcharge,
            Long justificatifId,
            String sourceMontant,
            String montantDetecteIa,
            String confianceIa) {
    }

    public record LigneDto(
            Long id,
            String posteCode,
            String posteLibelle,
            String fournisseur,
            LocalDate periodeDebut,
            LocalDate periodeFin,
            String montantTtc,
            String montantMois,
            String prorataPct,
            String montantRetenu,
            Long justificatifId,
            String justificatifNom,
            String sourceMontant,
            String montantDetecteIa,
            String confianceIa) {
    }

    public record NoteCalculRequest(String mois, List<LigneRequest> lignes) {
    }

    public record NoteGenerationRequest(String mois, Long templateId, List<LigneRequest> lignes) {
    }

    public record NoteApercuRequest(String mois, Long templateId, Boolean complet, List<LigneRequest> lignes) {
    }

    public record CalculResponse(
            List<LigneDto> lignes,
            String total,
            String totalEnLettres,
            String baseProrata,
            String baseProrataDetail) {
    }

    public record BrouillonDto(
            String mois,
            QuittanceDto quittance,
            List<LigneDto> lignes,
            String baseProrata,
            String baseProrataDetail,
            List<String> postesManquants) {
    }

    public record NoteDto(
            Long id,
            String mois,
            String numero,
            String total,
            int version,
            String statut,
            Long templateId,
            String templateNom,
            Integer templateVersion,
            Instant createdAt,
            List<LigneDto> lignes,
            boolean pdfDisponible,
            boolean pdfCompletDisponible) {
    }

    public record ExtractionDto(
            String typeSuggere,
            String fournisseur,
            String numeroFacture,
            String dateFacture,
            String periodeDebut,
            String periodeFin,
            String montantTtc,
            String montantHt,
            String devise,
            String extraitSource,
            String confiance) {
    }

    public record AnalyseDto(
            Long id,
            Long justificatifId,
            String nomFichier,
            String statut,
            String modele,
            Long dureeMs,
            ExtractionDto resultat,
            String messageErreur,
            Instant createdAt) {
    }

    public record AnalyseStartResponse(Long analyseId, String statut) {
    }

    public record LlmConfigDto(
            boolean actif,
            String fournisseur,
            String url,
            String modele,
            int timeoutSeconds,
            String temperature,
            int numCtx,
            int pagesMax,
            boolean ocrActif,
            String promptExtraction,
            boolean apiKeyConfiguree,
            boolean urlDistante,
            String avertissement) {
    }

    public record LlmConfigRequest(
            Boolean actif,
            String fournisseur,
            String url,
            String modele,
            Integer timeoutSeconds,
            String temperature,
            Integer numCtx,
            Integer pagesMax,
            Boolean ocrActif,
            String promptExtraction,
            String cleApi) {
    }

    public record LlmModelDto(String nom, String famille, String parametres, boolean vision) {
    }

    public record PromptDefautDto(String prompt) {
    }

    public record LlmStatusDto(
            String statut,
            boolean actif,
            boolean joignable,
            boolean modelePresent,
            String message) {
    }

    public record LlmTestResponse(
            boolean succes,
            long dureeMs,
            String message,
            String montantDetecte) {
    }

    public record RapportValidationDto(
            List<String> variablesReconnues,
            List<String> variablesInconnues,
            List<String> variablesManquantes,
            boolean structureValide,
            List<String> erreurs) {
    }

    public record TemplateDto(
            Long id,
            String type,
            String nom,
            int version,
            String format,
            boolean actif,
            boolean integre,
            Instant createdAt,
            RapportValidationDto rapport) {
    }

    public record TemplateVariableDto(String nom, String description, boolean obligatoire, String exemple) {
    }
}
