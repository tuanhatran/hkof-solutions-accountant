package fr.hkof.homeofficeexpenses.service.llm;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

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
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import fr.hkof.homeofficeexpenses.domain.AnalysisDocument;
import fr.hkof.homeofficeexpenses.domain.Receipt;
import fr.hkof.homeofficeexpenses.domain.LlmConfig;
import fr.hkof.homeofficeexpenses.domain.AnalysisStatus;
import fr.hkof.homeofficeexpenses.repository.AnalysisDocumentRepository;
import fr.hkof.homeofficeexpenses.service.BusinessException;
import fr.hkof.homeofficeexpenses.service.ReceiptService;
import fr.hkof.homeofficeexpenses.service.NotFoundException;
import fr.hkof.homeofficeexpenses.service.extraction.DocumentTextExtractor;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.AnalysisDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.ExtractionDto;
import jakarta.annotation.PreDestroy;

@Service
public class AnalysisJobService {

    private static final Logger LOG = LoggerFactory.getLogger(AnalysisJobService.class);
    private static final long SSE_TIMEOUT_MS = 180_000L;

    private final AnalysisDocumentRepository repository;
    private final ReceiptService receiptService;
    private final LlmConfigService llmConfigService;
    private final DocumentTextExtractor extractor;
    private final ExtractionPipeline pipeline;
    private final ThreadPoolTaskExecutor executor;
    private final TransactionTemplate transactions;
    private final Clock clock;
    private final ScheduledExecutorService planificateur;

    public AnalysisJobService(AnalysisDocumentRepository repository, ReceiptService receiptService,
            LlmConfigService llmConfigService, DocumentTextExtractor extractor, ExtractionPipeline pipeline,
            @Qualifier("analyseExecutor") ThreadPoolTaskExecutor executor,
            PlatformTransactionManager transactionManager, Clock clock) {
        this.repository = repository;
        this.receiptService = receiptService;
        this.llmConfigService = llmConfigService;
        this.extractor = extractor;
        this.pipeline = pipeline;
        this.executor = executor;
        this.transactions = new TransactionTemplate(transactionManager);
        this.clock = clock;
        ScheduledThreadPoolExecutor planificateurLocal = new ScheduledThreadPoolExecutor(2, tache -> {
            Thread thread = new Thread(tache, "analyse-sse");
            thread.setDaemon(true);
            return thread;
        });
        this.planificateur = planificateurLocal;
    }

    public AnalysisDto launch(Long receiptId) {
        Launch lancement = transactions.execute(status -> {
            Receipt receipt = receiptService.entity(receiptId);
            AnalysisDocument existante = repository.findFirstByReceiptIdAndStatusInOrderByIdDesc(
                    receiptId, List.of(AnalysisStatus.PENDING, AnalysisStatus.RUNNING)).orElse(null);
            if (existante != null) {
                return new Launch(existante.getId(), false);
            }
            AnalysisDocument analysis = new AnalysisDocument();
            analysis.setReceipt(receipt);
            analysis.setStatus(AnalysisStatus.PENDING);
            analysis.setCreatedAt(Instant.now(clock));
            analysis.setUpdatedAt(Instant.now(clock));
            return new Launch(repository.save(analysis).getId(), true);
        });
        if (lancement == null) {
            throw new NotFoundException("Justificatif introuvable.");
        }
        if (lancement.created()) {
            try {
                executor.execute(() -> execute(lancement.id()));
            } catch (RuntimeException ex) {
                transaction(() -> {
                    AnalysisDocument reloaded = repository.findById(lancement.id()).orElse(null);
                    if (reloaded != null) {
                        reloaded.setStatus(AnalysisStatus.FAILED);
                        reloaded.setErrorMessage("Le service d'analyse est saturé. Réessayez dans un instant.");
                        reloaded.setUpdatedAt(Instant.now(clock));
                        repository.save(reloaded);
                    }
                });
            }
        }
        return get(lancement.id());
    }

    private void execute(Long analysisId) {
        long debut = System.currentTimeMillis();
        ExtractionContext contexte;
        try {
            contexte = transactions.execute(status -> {
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
            LOG.warn("Impossible de démarrer l'analyse {}", analysisId, ex);
            markFailed(analysisId, "Impossible de démarrer l'analyse : " + ex.getMessage(), debut);
            return;
        }
        if (contexte == null) {
            return;
        }
        try {
            Path path = Path.of(contexte.path());
            if (!Files.exists(path)) {
                markFailed(analysisId, "Le fichier justificatif est introuvable sur le disque.", debut);
                return;
            }
            DocumentTextExtractor.Extraction extraction = extractor.extract(
                    path, contexte.mimeType(), contexte.config().getMaxPages());
            ExtractionDto result = pipeline.extract(
                    contexte.config(), extraction.text(), extraction.imagesBase64());
            finish(analysisId, result, debut);
        } catch (BusinessException ex) {
            markFailed(analysisId, ex.getMessage(), debut);
        } catch (RuntimeException ex) {
            LOG.warn("Échec de l'analyse {}", analysisId, ex);
            markFailed(analysisId, "L'analyse a échoué. Saisissez le montant manuellement.", debut);
        }
    }

    private void finish(Long analysisId, ExtractionDto result, long debut) {
        transaction(() -> {
            AnalysisDocument analysis = repository.findWithReceiptById(analysisId).orElse(null);
            if (analysis == null || analysis.getStatus() == AnalysisStatus.CANCELLED) {
                return;
            }
            analysis.setStatus(AnalysisStatus.DONE);
            analysis.setResultJson(pipeline.toJson(result));
            analysis.setErrorMessage(null);
            analysis.setDurationMs(System.currentTimeMillis() - debut);
            analysis.setUpdatedAt(Instant.now(clock));
            repository.save(analysis);
        });
    }

    private void markFailed(Long analysisId, String message, long debut) {
        transaction(() -> {
            AnalysisDocument analysis = repository.findWithReceiptById(analysisId).orElse(null);
            if (analysis == null || analysis.getStatus() == AnalysisStatus.CANCELLED) {
                return;
            }
            analysis.setStatus(AnalysisStatus.FAILED);
            analysis.setErrorMessage(message);
            analysis.setDurationMs(System.currentTimeMillis() - debut);
            analysis.setUpdatedAt(Instant.now(clock));
            repository.save(analysis);
        });
    }

    @Transactional(readOnly = true)
    public AnalysisDto get(Long id) {
        AnalysisDocument analysis = repository.findWithReceiptById(id)
                .orElseThrow(() -> new NotFoundException("Analyse introuvable."));
        return toDto(analysis);
    }

    @Transactional
    public AnalysisDto cancel(Long id) {
        AnalysisDocument analysis = repository.findWithReceiptById(id)
                .orElseThrow(() -> new NotFoundException("Analyse introuvable."));
        if (analysis.getStatus().isFinished()) {
            throw new BusinessException("Cette analyse est déjà terminée.");
        }
        analysis.setStatus(AnalysisStatus.CANCELLED);
        analysis.setErrorMessage("Analyse annulée par l'utilisateur.");
        analysis.setUpdatedAt(Instant.now(clock));
        return toDto(repository.save(analysis));
    }

    public SseEmitter events(Long id) {
        get(id);
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        AtomicBoolean termine = new AtomicBoolean(false);
        emitter.onCompletion(() -> termine.set(true));
        emitter.onTimeout(() -> {
            termine.set(true);
            emitter.complete();
        });
        emitter.onError(ex -> termine.set(true));
        long echeance = System.currentTimeMillis() + SSE_TIMEOUT_MS;
        planificateur.schedule(() -> broadcast(id, emitter, termine, echeance), 0, TimeUnit.MILLISECONDS);
        return emitter;
    }

    private void broadcast(Long id, SseEmitter emitter, AtomicBoolean termine, long echeance) {
        if (termine.get()) {
            return;
        }
        try {
            AnalysisDto dto = get(id);
            emitter.send(SseEmitter.event().name("analyse").data(dto));
            if (AnalysisStatus.valueOf(dto.status()).isFinished() || System.currentTimeMillis() > echeance) {
                termine.set(true);
                emitter.complete();
                return;
            }
            planificateur.schedule(() -> broadcast(id, emitter, termine, echeance), 900, TimeUnit.MILLISECONDS);
        } catch (Exception ex) {
            termine.set(true);
            try {
                emitter.completeWithError(ex);
            } catch (RuntimeException ignored) {
                // The client has already closed the connection.
            }
        }
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

    @PreDestroy
    void stop() {
        planificateur.shutdownNow();
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
