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
import fr.hkof.homeofficeexpenses.repository.AnalysisDocumentRepository;
import fr.hkof.homeofficeexpenses.repository.ReceiptRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseLineRepository;
import fr.hkof.homeofficeexpenses.repository.LlmConfigRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseStatementRepository;
import fr.hkof.homeofficeexpenses.repository.SettingsRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.repository.RentReceiptRepository;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;

@Service
@Profile("e2e")
public class E2eResetService {

    private static final List<String> FOLDERS = List.of("justificatifs", "sorties", "templates");

    private final AnalysisDocumentRepository analyses;
    private final ExpenseLineRepository lines;
    private final ExpenseStatementRepository statements;
    private final RentReceiptRepository rentReceipts;
    private final ReceiptRepository receipts;
    private final TemplateDocumentRepository templates;
    private final LlmConfigRepository llmConfigs;
    private final ExpenseItemRepository items;
    private final SettingsRepository parameters;
    private final StorageService stockage;
    private final DataInitializer initializer;

    public E2eResetService(AnalysisDocumentRepository analyses, ExpenseLineRepository lines,
            ExpenseStatementRepository statements, RentReceiptRepository rentReceipts, ReceiptRepository receipts,
            TemplateDocumentRepository templates, LlmConfigRepository llmConfigs, ExpenseItemRepository items,
            SettingsRepository parameters, StorageService stockage, DataInitializer initializer) {
        this.analyses = analyses;
        this.lines = lines;
        this.statements = statements;
        this.rentReceipts = rentReceipts;
        this.receipts = receipts;
        this.templates = templates;
        this.llmConfigs = llmConfigs;
        this.items = items;
        this.parameters = parameters;
        this.stockage = stockage;
        this.initializer = initializer;
    }

    @Transactional
    public void reset() {
        analyses.deleteAllInBatch();
        lines.deleteAllInBatch();
        statements.deleteAllInBatch();
        rentReceipts.deleteAllInBatch();
        receipts.deleteAllInBatch();
        templates.deleteAllInBatch();
        llmConfigs.deleteAllInBatch();
        items.deleteAllInBatch();
        parameters.deleteAllInBatch();
        cleanFiles();
        initializer.run(new DefaultApplicationArguments(new String[0]));
    }

    private void cleanFiles() {
        for (String folder : FOLDERS) {
            Path rootPath = stockage.root().resolve(folder);
            try {
                if (Files.exists(rootPath)) {
                    try (Stream<Path> chemins = Files.walk(rootPath)) {
                        List<Path> toDelete = chemins.sorted(Comparator.reverseOrder()).toList();
                        for (Path path : toDelete) {
                            Files.deleteIfExists(path);
                        }
                    }
                }
                Files.createDirectories(rootPath);
            } catch (IOException ex) {
                throw new IllegalStateException("Impossible to clean e2e folder " + rootPath, ex);
            }
        }
    }
}
