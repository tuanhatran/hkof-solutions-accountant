package fr.hkof.homeofficeexpenses.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.config.DataInitializer;
import fr.hkof.homeofficeexpenses.repository.AnalyseDocumentRepository;
import fr.hkof.homeofficeexpenses.repository.JustificatifRepository;
import fr.hkof.homeofficeexpenses.repository.LigneFraisRepository;
import fr.hkof.homeofficeexpenses.repository.LlmConfigRepository;
import fr.hkof.homeofficeexpenses.repository.NoteFraisRepository;
import fr.hkof.homeofficeexpenses.repository.ParametresRepository;
import fr.hkof.homeofficeexpenses.repository.PosteRepository;
import fr.hkof.homeofficeexpenses.repository.QuittanceRepository;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;

@Service
@Profile("e2e")
public class E2eResetService {

    private static final List<String> DOSSIERS = List.of("justificatifs", "sorties", "templates");

    private final AnalyseDocumentRepository analyses;
    private final LigneFraisRepository lignes;
    private final NoteFraisRepository notes;
    private final QuittanceRepository quittances;
    private final JustificatifRepository justificatifs;
    private final TemplateDocumentRepository templates;
    private final LlmConfigRepository llmConfigs;
    private final PosteRepository postes;
    private final ParametresRepository parametres;
    private final StockageService stockage;
    private final DataInitializer initializer;

    public E2eResetService(AnalyseDocumentRepository analyses, LigneFraisRepository lignes,
            NoteFraisRepository notes, QuittanceRepository quittances, JustificatifRepository justificatifs,
            TemplateDocumentRepository templates, LlmConfigRepository llmConfigs, PosteRepository postes,
            ParametresRepository parametres, StockageService stockage, DataInitializer initializer) {
        this.analyses = analyses;
        this.lignes = lignes;
        this.notes = notes;
        this.quittances = quittances;
        this.justificatifs = justificatifs;
        this.templates = templates;
        this.llmConfigs = llmConfigs;
        this.postes = postes;
        this.parametres = parametres;
        this.stockage = stockage;
        this.initializer = initializer;
    }

    @Transactional
    public void reinitialiser() {
        analyses.deleteAllInBatch();
        lignes.deleteAllInBatch();
        notes.deleteAllInBatch();
        quittances.deleteAllInBatch();
        justificatifs.deleteAllInBatch();
        templates.deleteAllInBatch();
        llmConfigs.deleteAllInBatch();
        postes.deleteAllInBatch();
        parametres.deleteAllInBatch();
        nettoyerFichiers();
        initializer.run(new DefaultApplicationArguments(new String[0]));
    }

    private void nettoyerFichiers() {
        for (String dossier : DOSSIERS) {
            Path racine = stockage.racine().resolve(dossier);
            try {
                if (Files.exists(racine)) {
                    try (Stream<Path> chemins = Files.walk(racine)) {
                        List<Path> aSupprimer = chemins.sorted(Comparator.reverseOrder()).toList();
                        for (Path chemin : aSupprimer) {
                            Files.deleteIfExists(chemin);
                        }
                    }
                }
                Files.createDirectories(racine);
            } catch (IOException ex) {
                throw new IllegalStateException("Impossible de nettoyer le dossier e2e " + racine, ex);
            }
        }
    }
}
