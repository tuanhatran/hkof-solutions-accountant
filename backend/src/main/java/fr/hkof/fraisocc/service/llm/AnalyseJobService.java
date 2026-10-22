package fr.hkof.fraisocc.service.llm;

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

import fr.hkof.fraisocc.domain.AnalyseDocument;
import fr.hkof.fraisocc.domain.Justificatif;
import fr.hkof.fraisocc.domain.LlmConfig;
import fr.hkof.fraisocc.domain.StatutAnalyse;
import fr.hkof.fraisocc.repository.AnalyseDocumentRepository;
import fr.hkof.fraisocc.service.BusinessException;
import fr.hkof.fraisocc.service.JustificatifService;
import fr.hkof.fraisocc.service.NotFoundException;
import fr.hkof.fraisocc.service.extraction.DocumentTextExtractor;
import fr.hkof.fraisocc.web.dto.Dtos.AnalyseDto;
import fr.hkof.fraisocc.web.dto.Dtos.ExtractionDto;
import jakarta.annotation.PreDestroy;

@Service
public class AnalyseJobService {

    private static final Logger LOG = LoggerFactory.getLogger(AnalyseJobService.class);
    private static final long DUREE_SSE_MS = 180_000L;

    private final AnalyseDocumentRepository repository;
    private final JustificatifService justificatifService;
    private final LlmConfigService llmConfigService;
    private final DocumentTextExtractor extractor;
    private final ExtractionPipeline pipeline;
    private final ThreadPoolTaskExecutor executor;
    private final TransactionTemplate transactions;
    private final Clock clock;
    private final ScheduledExecutorService planificateur;

    public AnalyseJobService(AnalyseDocumentRepository repository, JustificatifService justificatifService,
            LlmConfigService llmConfigService, DocumentTextExtractor extractor, ExtractionPipeline pipeline,
            @Qualifier("analyseExecutor") ThreadPoolTaskExecutor executor,
            PlatformTransactionManager transactionManager, Clock clock) {
        this.repository = repository;
        this.justificatifService = justificatifService;
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

    public AnalyseDto lancer(Long justificatifId) {
        Lancement lancement = transactions.execute(statut -> {
            Justificatif justificatif = justificatifService.entite(justificatifId);
            AnalyseDocument existante = repository.findFirstByJustificatifIdAndStatutInOrderByIdDesc(
                    justificatifId, List.of(StatutAnalyse.EN_ATTENTE, StatutAnalyse.EN_COURS)).orElse(null);
            if (existante != null) {
                return new Lancement(existante.getId(), false);
            }
            AnalyseDocument analyse = new AnalyseDocument();
            analyse.setJustificatif(justificatif);
            analyse.setStatut(StatutAnalyse.EN_ATTENTE);
            analyse.setCreatedAt(Instant.now(clock));
            analyse.setUpdatedAt(Instant.now(clock));
            return new Lancement(repository.save(analyse).getId(), true);
        });
        if (lancement == null) {
            throw new NotFoundException("Justificatif introuvable.");
        }
        if (lancement.nouvelle()) {
            try {
                executor.execute(() -> executer(lancement.id()));
            } catch (RuntimeException ex) {
                transaction(() -> {
                    AnalyseDocument rechargee = repository.findById(lancement.id()).orElse(null);
                    if (rechargee != null) {
                        rechargee.setStatut(StatutAnalyse.ECHEC);
                        rechargee.setMessageErreur("Le service d'analyse est saturé. Réessayez dans un instant.");
                        rechargee.setUpdatedAt(Instant.now(clock));
                        repository.save(rechargee);
                    }
                });
            }
        }
        return obtenir(lancement.id());
    }

    private void executer(Long analyseId) {
        long debut = System.currentTimeMillis();
        Contexte contexte;
        try {
            contexte = transactions.execute(statut -> {
                AnalyseDocument analyse = repository.findWithJustificatifById(analyseId).orElse(null);
                if (analyse == null || analyse.getStatut() != StatutAnalyse.EN_ATTENTE) {
                    return null;
                }
                LlmConfig config = llmConfigService.entite();
                if (!config.isActif()) {
                    analyse.setStatut(StatutAnalyse.ECHEC);
                    analyse.setMessageErreur("L'analyse IA est désactivée. Saisissez le montant manuellement.");
                    analyse.setDureeMs(0L);
                    analyse.setUpdatedAt(Instant.now(clock));
                    repository.save(analyse);
                    return null;
                }
                analyse.setStatut(StatutAnalyse.EN_COURS);
                analyse.setModele(config.getModele());
                analyse.setUpdatedAt(Instant.now(clock));
                repository.save(analyse);
                Justificatif justificatif = analyse.getJustificatif();
                return new Contexte(justificatif.getChemin(), justificatif.getTypeMime(), config);
            });
        } catch (RuntimeException ex) {
            LOG.warn("Impossible de démarrer l'analyse {}", analyseId, ex);
            marquerEchec(analyseId, "Impossible de démarrer l'analyse : " + ex.getMessage(), debut);
            return;
        }
        if (contexte == null) {
            return;
        }
        try {
            Path chemin = Path.of(contexte.chemin());
            if (!Files.exists(chemin)) {
                marquerEchec(analyseId, "Le fichier justificatif est introuvable sur le disque.", debut);
                return;
            }
            DocumentTextExtractor.Extraction extraction = extractor.extraire(
                    chemin, contexte.typeMime(), contexte.config().getPagesMax());
            ExtractionDto resultat = pipeline.extraire(
                    contexte.config(), extraction.texte(), extraction.imagesBase64());
            terminer(analyseId, resultat, debut);
        } catch (BusinessException ex) {
            marquerEchec(analyseId, ex.getMessage(), debut);
        } catch (RuntimeException ex) {
            LOG.warn("Échec de l'analyse {}", analyseId, ex);
            marquerEchec(analyseId, "L'analyse a échoué. Saisissez le montant manuellement.", debut);
        }
    }

    private void terminer(Long analyseId, ExtractionDto resultat, long debut) {
        transaction(() -> {
            AnalyseDocument analyse = repository.findWithJustificatifById(analyseId).orElse(null);
            if (analyse == null || analyse.getStatut() == StatutAnalyse.ANNULEE) {
                return;
            }
            analyse.setStatut(StatutAnalyse.TERMINEE);
            analyse.setResultatJson(pipeline.versJson(resultat));
            analyse.setMessageErreur(null);
            analyse.setDureeMs(System.currentTimeMillis() - debut);
            analyse.setUpdatedAt(Instant.now(clock));
            repository.save(analyse);
        });
    }

    private void marquerEchec(Long analyseId, String message, long debut) {
        transaction(() -> {
            AnalyseDocument analyse = repository.findWithJustificatifById(analyseId).orElse(null);
            if (analyse == null || analyse.getStatut() == StatutAnalyse.ANNULEE) {
                return;
            }
            analyse.setStatut(StatutAnalyse.ECHEC);
            analyse.setMessageErreur(message);
            analyse.setDureeMs(System.currentTimeMillis() - debut);
            analyse.setUpdatedAt(Instant.now(clock));
            repository.save(analyse);
        });
    }

    @Transactional(readOnly = true)
    public AnalyseDto obtenir(Long id) {
        AnalyseDocument analyse = repository.findWithJustificatifById(id)
                .orElseThrow(() -> new NotFoundException("Analyse introuvable."));
        return versDto(analyse);
    }

    @Transactional
    public AnalyseDto annuler(Long id) {
        AnalyseDocument analyse = repository.findWithJustificatifById(id)
                .orElseThrow(() -> new NotFoundException("Analyse introuvable."));
        if (analyse.getStatut().estTermine()) {
            throw new BusinessException("Cette analyse est déjà terminée.");
        }
        analyse.setStatut(StatutAnalyse.ANNULEE);
        analyse.setMessageErreur("Analyse annulée par l'utilisateur.");
        analyse.setUpdatedAt(Instant.now(clock));
        return versDto(repository.save(analyse));
    }

    public SseEmitter evenements(Long id) {
        obtenir(id);
        SseEmitter emitter = new SseEmitter(DUREE_SSE_MS);
        AtomicBoolean termine = new AtomicBoolean(false);
        emitter.onCompletion(() -> termine.set(true));
        emitter.onTimeout(() -> {
            termine.set(true);
            emitter.complete();
        });
        emitter.onError(ex -> termine.set(true));
        long echeance = System.currentTimeMillis() + DUREE_SSE_MS;
        planificateur.schedule(() -> diffuser(id, emitter, termine, echeance), 0, TimeUnit.MILLISECONDS);
        return emitter;
    }

    private void diffuser(Long id, SseEmitter emitter, AtomicBoolean termine, long echeance) {
        if (termine.get()) {
            return;
        }
        try {
            AnalyseDto dto = obtenir(id);
            emitter.send(SseEmitter.event().name("analyse").data(dto));
            if (StatutAnalyse.valueOf(dto.statut()).estTermine() || System.currentTimeMillis() > echeance) {
                termine.set(true);
                emitter.complete();
                return;
            }
            planificateur.schedule(() -> diffuser(id, emitter, termine, echeance), 900, TimeUnit.MILLISECONDS);
        } catch (Exception ex) {
            termine.set(true);
            try {
                emitter.completeWithError(ex);
            } catch (RuntimeException ignored) {
                // Le client a déjà fermé la connexion.
            }
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public void nettoyerAnalysesInterrompues() {
        transaction(() -> {
            List<AnalyseDocument> analyses = repository.findByStatutIn(
                    List.of(StatutAnalyse.EN_ATTENTE, StatutAnalyse.EN_COURS));
            for (AnalyseDocument analyse : analyses) {
                analyse.setStatut(StatutAnalyse.ECHEC);
                analyse.setMessageErreur("Analyse interrompue par un redémarrage. Relancez l'analyse.");
                analyse.setUpdatedAt(Instant.now(clock));
                repository.save(analyse);
            }
        });
    }

    private void transaction(Runnable action) {
        transactions.executeWithoutResult(statut -> action.run());
    }

    @PreDestroy
    void arreter() {
        planificateur.shutdownNow();
    }

    public AnalyseDto versDto(AnalyseDocument analyse) {
        ExtractionDto resultat = pipeline.depuisJson(analyse.getResultatJson());
        Justificatif justificatif = analyse.getJustificatif();
        return new AnalyseDto(
                analyse.getId(),
                justificatif.getId(),
                justificatif.getNomFichier(),
                analyse.getStatut().name(),
                analyse.getModele(),
                analyse.getDureeMs(),
                resultat,
                analyse.getMessageErreur(),
                analyse.getCreatedAt());
    }

    private record Contexte(String chemin, String typeMime, LlmConfig config) {
    }

    private record Lancement(Long id, boolean nouvelle) {
    }
}
