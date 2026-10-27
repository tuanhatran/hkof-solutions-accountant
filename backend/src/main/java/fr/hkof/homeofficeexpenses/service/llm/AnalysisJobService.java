package fr.hkof.homeofficeexpenses.service.llm;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import fr.hkof.homeofficeexpenses.domain.AnalysisDocument;
import fr.hkof.homeofficeexpenses.domain.Receipt;
import fr.hkof.homeofficeexpenses.domain.LlmConfig;
import fr.hkof.homeofficeexpenses.domain.AnalysisStatus;
import fr.hkof.homeofficeexpenses.repository.AnalysisDocumentRepository;
import fr.hkof.homeofficeexpenses.service.BusinessException;
import fr.hkof.homeofficeexpenses.service.ReceiptService;
import fr.hkof.homeofficeexpenses.service.NotFoundException;
import fr.hkof.homeofficeexpenses.service.extraction.DocumentTextExtractor;
import fr.hkof.homeofficeexpenses.web.dto.ExtractionDtos.AnalysisDto;
import fr.hkof.homeofficeexpenses.web.dto.ExtractionDtos.ExtractionDto;

@Service
public class AnalysisJobService {

    private static final Logger LOG = LoggerFactory.getLogger(AnalysisJobService.class);

    private final AnalysisDocumentRepository repository;
    private final ReceiptService receiptService;
    private final LlmConfigService llmConfigService;
    private final DocumentTextExtractor extractor;
    private final ExtractionPipeline pipeline;
    private final ThreadPoolTaskExecutor executor;
    private final TransactionTemplate transactions;
    private final Clock clock;

    public AnalysisJobService(AnalysisDocumentRepository repository, ReceiptService receiptService,
            LlmConfigService llmConfigService, DocumentTextExtractor extractor, ExtractionPipeline pipeline,
            @Qualifier("analysisExecutor") ThreadPoolTaskExecutor executor,
            PlatformTransactionManager transactionManager, Clock clock) {
        this.repository = repository;
        this.receiptService = receiptService;
        this.llmConfigService = llmConfigService;
        this.extractor = extractor;
        this.pipeline = pipeline;
        this.executor = executor;
        this.transactions = new TransactionTemplate(transactionManager);
        this.clock = clock;
    }

    public AnalysisDto launch(Long receiptId) {
        Launch launch = transactions.execute(status -> {
            Receipt receipt = receiptService.entity(receiptId);
            AnalysisDocument existingAnalysis = repository.findFirstByReceiptIdAndStatusInOrderByIdDesc(
                    receiptId, List.of(AnalysisStatus.PENDING, AnalysisStatus.RUNNING)).orElse(null);
            if (existingAnalysis != null) {
                return new Launch(existingAnalysis.getId(), false);
            }
            AnalysisDocument analysis = new AnalysisDocument();
            analysis.setReceipt(receipt);
            analysis.setStatus(AnalysisStatus.PENDING);
            analysis.setCreatedAt(Instant.now(clock));
            analysis.setUpdatedAt(Instant.now(clock));
            return new Launch(repository.save(analysis).getId(), true);
        });
        if (launch == null) {
            throw new NotFoundException("RECEIPT_NOT_FOUND", "Justificatif introuvable.");
        }
        if (launch.created()) {
            try {
                executor.execute(() -> execute(launch.id()));
            } catch (RuntimeException ex) {
                transaction(() -> {
                    AnalysisDocument reloaded = repository.findById(launch.id()).orElse(null);
                    if (reloaded != null) {
                        reloaded.setStatus(AnalysisStatus.FAILED);
                        reloaded.setErrorMessage("Le service d'analyse est saturé. Réessayez dans un instant.");
                        reloaded.setUpdatedAt(Instant.now(clock));
                        repository.save(reloaded);
                    }
                });
            }
        }
        return get(launch.id());
    }

    private void execute(Long analysisId) {
        long startedAt = System.currentTimeMillis();
        ExtractionContext context;
        try {
            context = transactions.execute(status -> {
                AnalysisDocument analysis = repository.findWithReceiptById(analysisId).orElse(null);
                if (analysis == null || analysis.getStatus() != AnalysisStatus.PENDING) {
                    return null;
                }
                LlmConfig config = llmConfigService.entity();
                if (!config.isActive()) {
                    analysis.setStatus(AnalysisStatus.FAILED);
                    analysis.setErrorMessage("L'analyse IA est désactivée. Saisissez le montant manuellement.");
                    analysis.setDurationMs(0L);
                    analysis.setUpdatedAt(Instant.now(clock));
                    repository.save(analysis);
                    return null;
                }
                analysis.setStatus(AnalysisStatus.RUNNING);
                analysis.setModel(config.getModel());
                analysis.setUpdatedAt(Instant.now(clock));
                repository.save(analysis);
                Receipt receipt = analysis.getReceipt();
                return new ExtractionContext(receipt.getPath(), receipt.getMimeType(), config);
            });
        } catch (RuntimeException ex) {
            LOG.warn("Unable to start analysis {}", analysisId, ex);
            markFailed(analysisId, "Impossible de démarrer l'analyse : " + ex.getMessage(), startedAt);
            return;
        }
        if (context == null) {
            return;
        }
        try {
            Path path = Path.of(context.path());
            if (!Files.exists(path)) {
                markFailed(analysisId, "Le fichier justificatif est introuvable sur le disque.", startedAt);
                return;
            }
            DocumentTextExtractor.Extraction extraction = extractor.extract(
                    path, context.mimeType(), context.config().getMaxPages());
            ExtractionDto result = pipeline.extract(
                    context.config(), extraction.text(), extraction.imagesBase64());
            finish(analysisId, result, startedAt);
        } catch (BusinessException ex) {
            markFailed(analysisId, ex.getMessage(), startedAt);
        } catch (RuntimeException ex) {
            LOG.warn("Analysis failed {}", analysisId, ex);
            markFailed(analysisId, "L'analyse a échoué. Saisissez le montant manuellement.", startedAt);
        }
    }

    private void finish(Long analysisId, ExtractionDto result, long startedAt) {
        transaction(() -> {
            AnalysisDocument analysis = repository.findWithReceiptById(analysisId).orElse(null);
            if (analysis == null || analysis.getStatus() == AnalysisStatus.CANCELLED) {
                return;
            }
            analysis.setStatus(AnalysisStatus.DONE);
            analysis.setResultJson(pipeline.toJson(result));
            analysis.setErrorMessage(null);
            analysis.setDurationMs(System.currentTimeMillis() - startedAt);
            analysis.setUpdatedAt(Instant.now(clock));
            repository.save(analysis);
        });
    }

    private void markFailed(Long analysisId, String message, long startedAt) {
        transaction(() -> {
            AnalysisDocument analysis = repository.findWithReceiptById(analysisId).orElse(null);
            if (analysis == null || analysis.getStatus() == AnalysisStatus.CANCELLED) {
                return;
            }
            analysis.setStatus(AnalysisStatus.FAILED);
            analysis.setErrorMessage(message);
            analysis.setDurationMs(System.currentTimeMillis() - startedAt);
            analysis.setUpdatedAt(Instant.now(clock));
            repository.save(analysis);
        });
    }

    @Transactional(readOnly = true)
    public AnalysisDto get(Long id) {
        AnalysisDocument analysis = repository.findWithReceiptById(id)
                .orElseThrow(() -> new NotFoundException("ANALYSIS_NOT_FOUND", "Analyse introuvable."));
        return toDto(analysis);
    }

    @Transactional
    public AnalysisDto cancel(Long id) {
        AnalysisDocument analysis = repository.findWithReceiptById(id)
                .orElseThrow(() -> new NotFoundException("ANALYSIS_NOT_FOUND", "Analyse introuvable."));
        if (analysis.getStatus().isFinished()) {
            throw new BusinessException("ANALYSIS_ALREADY_FINISHED", "Cette analyse est déjà terminée.");
        }
        analysis.setStatus(AnalysisStatus.CANCELLED);
        analysis.setErrorMessage("Analyse annulée par l'utilisateur.");
        analysis.setUpdatedAt(Instant.now(clock));
        return toDto(repository.save(analysis));
    }

    @EventListener(ApplicationReadyEvent.class)
    public void cleanInterruptedAnalyses() {
        transaction(() -> {
            List<AnalysisDocument> analyses = repository.findByStatusIn(
                    List.of(AnalysisStatus.PENDING, AnalysisStatus.RUNNING));
            for (AnalysisDocument analysis : analyses) {
                analysis.setStatus(AnalysisStatus.FAILED);
                analysis.setErrorMessage("Analyse interrompue par un redémarrage. Relancez l'analyse.");
                analysis.setUpdatedAt(Instant.now(clock));
                repository.save(analysis);
            }
        });
    }

    private void transaction(Runnable action) {
        transactions.executeWithoutResult(status -> action.run());
    }

    public AnalysisDto toDto(AnalysisDocument analysis) {
        ExtractionDto result = pipeline.fromJson(analysis.getResultJson());
        Receipt receipt = analysis.getReceipt();
        return new AnalysisDto(
                analysis.getId(),
                receipt.getId(),
                receipt.getFileName(),
                analysis.getStatus().name(),
                analysis.getModel(),
                analysis.getDurationMs(),
                result,
                analysis.getErrorMessage(),
                analysis.getCreatedAt());
    }

    private record ExtractionContext(String path, String mimeType, LlmConfig config) {
    }

    private record Launch(Long id, boolean created) {
    }
}
