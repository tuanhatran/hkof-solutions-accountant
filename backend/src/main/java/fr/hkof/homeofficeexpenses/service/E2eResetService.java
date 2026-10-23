package fr.hkof.homeofficeexpenses.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.config.DataInitializer;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.SignatureType;
import fr.hkof.homeofficeexpenses.repository.AnalysisDocumentRepository;
import fr.hkof.homeofficeexpenses.repository.ReceiptRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseLineRepository;
import fr.hkof.homeofficeexpenses.repository.LlmConfigRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseStatementRepository;
import fr.hkof.homeofficeexpenses.repository.SettingsRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.repository.RentReceiptRepository;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;

@Service
@Profile("e2e")
public class E2eResetService {

    private static final List<String> FOLDERS = List.of("justificatifs", "sorties", "templates");

    /** Synthetic 1x1 PNG, never a real personal signature. */
    private static final byte[] DEFAULT_SIGNATURE_PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=");

    private final AnalysisDocumentRepository analyses;
    private final ExpenseLineRepository lines;
    private final ExpenseStatementRepository statements;
    private final RentReceiptRepository rentReceipts;
    private final ReceiptRepository receipts;
    private final TemplateDocumentRepository templates;
    private final LlmConfigRepository llmConfigs;
    private final ExpenseItemRepository items;
    private final SettingsRepository settings;
    private final SignatureRepository signatures;
    private final StorageService storage;
    private final DataInitializer initializer;

    public E2eResetService(AnalysisDocumentRepository analyses, ExpenseLineRepository lines,
            ExpenseStatementRepository statements, RentReceiptRepository rentReceipts, ReceiptRepository receipts,
            TemplateDocumentRepository templates, LlmConfigRepository llmConfigs, ExpenseItemRepository items,
            SettingsRepository settings, SignatureRepository signatures, StorageService storage,
            DataInitializer initializer) {
        this.analyses = analyses;
        this.lines = lines;
        this.statements = statements;
        this.rentReceipts = rentReceipts;
        this.receipts = receipts;
        this.templates = templates;
        this.llmConfigs = llmConfigs;
        this.items = items;
        this.settings = settings;
        this.signatures = signatures;
        this.storage = storage;
        this.initializer = initializer;
    }

    @Transactional
    public void reset() {
        signatures.deleteAllInBatch();
        analyses.deleteAllInBatch();
        lines.deleteAllInBatch();
        statements.deleteAllInBatch();
        rentReceipts.deleteAllInBatch();
        receipts.deleteAllInBatch();
        templates.deleteAllInBatch();
        llmConfigs.deleteAllInBatch();
        items.deleteAllInBatch();
        settings.deleteAllInBatch();
        cleanFiles();
        initializer.run(new DefaultApplicationArguments(new String[0]));
        seedSignatures();
    }

    private void seedSignatures() {
        Instant now = Instant.now();
        saveSignature(SignatureType.LANDLORD, "Signature du bailleur (e2e)", "signature-bailleur-e2e.png", now);
        saveSignature(SignatureType.ENTREPRISE_CEO, "Signature du gérant (e2e)", "signature-gerant-e2e.png", now);
    }

    private void saveSignature(SignatureType type, String name, String fileName, Instant createdAt) {
        Signature signature = new Signature();
        signature.setType(type);
        signature.setName(name);
        signature.setMimeType("image/png");
        signature.setFileName(fileName);
        signature.setImage(DEFAULT_SIGNATURE_PNG);
        signature.setDeleted(false);
        signature.setCreatedAt(createdAt);
        signatures.save(signature);
    }

    private void cleanFiles() {
        for (String folder : FOLDERS) {
            Path rootPath = storage.root().resolve(folder);
            try {
                if (Files.exists(rootPath)) {
                    try (Stream<Path> paths = Files.walk(rootPath)) {
                        List<Path> toDelete = paths.sorted(Comparator.reverseOrder()).toList();
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
