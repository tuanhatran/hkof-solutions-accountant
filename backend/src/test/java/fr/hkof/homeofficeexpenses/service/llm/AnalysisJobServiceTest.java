package fr.hkof.homeofficeexpenses.service.llm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import fr.hkof.homeofficeexpenses.domain.AnalysisDocument;
import fr.hkof.homeofficeexpenses.domain.AnalysisStatus;
import fr.hkof.homeofficeexpenses.domain.LlmConfig;
import fr.hkof.homeofficeexpenses.domain.Receipt;
import fr.hkof.homeofficeexpenses.repository.AnalysisDocumentRepository;
import fr.hkof.homeofficeexpenses.service.BusinessException;
import fr.hkof.homeofficeexpenses.service.NotFoundException;
import fr.hkof.homeofficeexpenses.service.ReceiptService;
import fr.hkof.homeofficeexpenses.service.extraction.DocumentTextExtractor;
import fr.hkof.homeofficeexpenses.web.dto.ExtractionDtos.AnalysisDto;
import fr.hkof.homeofficeexpenses.web.dto.ExtractionDtos.ExtractionDto;

class AnalysisJobServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-24T10:00:00Z");
    private static final ExtractionDto RESULT = new ExtractionDto(
            "gaz", "EDF", "FA-1", "2026-10-05", "78.00", "65.00", "EUR", "Total TTC", "haute");

    @TempDir
    Path tempDir;

    private AnalysisDocumentRepository repository;
    private ReceiptService receiptService;
    private LlmConfigService llmConfigService;
    private DocumentTextExtractor extractor;
    private ExtractionPipeline pipeline;
    private CapturingExecutor executor;
    private PlatformTransactionManager transactionManager;
    private AnalysisJobService service;
    private Path receiptFile;
    private AnalysisDocument launched;

    @BeforeEach
    void setUp() throws IOException {
        repository = mock(AnalysisDocumentRepository.class);
        receiptService = mock(ReceiptService.class);
        llmConfigService = mock(LlmConfigService.class);
        extractor = mock(DocumentTextExtractor.class);
        pipeline = mock(ExtractionPipeline.class);
        executor = new CapturingExecutor();
        transactionManager = mock(PlatformTransactionManager.class);
        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        receiptFile = Files.writeString(tempDir.resolve("facture.pdf"), "contenu");
        service = new AnalysisJobService(repository, receiptService, llmConfigService, extractor, pipeline,
                executor, transactionManager, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    @DisplayName("A pending analysis for the same receipt is reused instead of relaunched")
    void reusesPendingAnalysis() {
        AnalysisDocument existing = analysis(AnalysisStatus.PENDING);
        when(receiptService.entity(1L)).thenReturn(existing.getReceipt());
        when(repository.findFirstByReceiptIdAndStatusInOrderByIdDesc(eq(1L), anyList()))
                .thenReturn(Optional.of(existing));
        when(repository.findWithReceiptById(42L)).thenReturn(Optional.of(existing));
        when(pipeline.fromJson(any())).thenReturn(null);

        AnalysisDto dto = service.launch(1L);

        assertThat(dto.id()).isEqualTo(42L);
        assertThat(dto.status()).isEqualTo("PENDING");
        assertThat(executor.tasks).isEmpty();
        verify(repository, never()).save(any(AnalysisDocument.class));
    }

    @Test
    @DisplayName("A new launch persists a PENDING analysis and schedules the job")
    void launchesNewAnalysis() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(pipeline.fromJson(any())).thenReturn(null);

        AnalysisDto dto = service.launch(1L);

        assertThat(dto.status()).isEqualTo("PENDING");
        assertThat(dto.receiptId()).isEqualTo(1L);
        assertThat(dto.fileName()).isEqualTo("facture.pdf");
        assertThat(launched.getCreatedAt()).isEqualTo(NOW);
        assertThat(launched.getUpdatedAt()).isEqualTo(NOW);
        assertThat(executor.tasks).hasSize(1);
    }

    @Test
    @DisplayName("A successful run stores the extraction, the model and the duration")
    void storesSuccessfulExtraction() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(llmConfigService.entity()).thenReturn(config(true));
        when(extractor.extract(any(Path.class), anyString(), anyInt()))
                .thenReturn(new DocumentTextExtractor.Extraction("texte", List.of(), false, 1));
        when(pipeline.extract(any(LlmConfig.class), anyString(), anyList())).thenReturn(RESULT);
        when(pipeline.toJson(RESULT)).thenReturn("{\"montant_ttc\":\"78.00\"}");
        when(pipeline.fromJson("{\"montant_ttc\":\"78.00\"}")).thenReturn(RESULT);

        service.launch(1L);
        executor.tasks.get(0).run();

        AnalysisDto dto = service.get(42L);
        assertThat(dto.status()).isEqualTo("DONE");
        assertThat(dto.result()).isSameAs(RESULT);
        assertThat(dto.model()).isEqualTo("llama-test");
        assertThat(dto.durationMs()).isNotNull().isGreaterThanOrEqualTo(0L);
        assertThat(dto.errorMessage()).isNull();
        assertThat(launched.getResultJson()).isEqualTo("{\"montant_ttc\":\"78.00\"}");
    }

    @Test
    @DisplayName("A disabled LLM marks the analysis FAILED and keeps manual entry possible")
    void disabledLlmFailsAnalysis() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(llmConfigService.entity()).thenReturn(config(false));
        when(pipeline.fromJson(any())).thenReturn(null);

        service.launch(1L);
        executor.tasks.get(0).run();

        assertThat(launched.getStatus()).isEqualTo(AnalysisStatus.FAILED);
        assertThat(launched.getErrorMessage())
                .isEqualTo("L'analyse IA est désactivée. Saisissez le montant manuellement.");
        assertThat(launched.getDurationMs()).isZero();
        verify(extractor, never()).extract(any(Path.class), anyString(), anyInt());
    }

    @Test
    @DisplayName("Execution uses the authenticated owner's LLM configuration via entityForUser")
    void usesOwnerLlmConfigWhenOwnershipContextAvailable() {
        fr.hkof.homeofficeexpenses.service.OwnershipContext ownershipContext = mock(
                fr.hkof.homeofficeexpenses.service.OwnershipContext.class);
        when(ownershipContext.currentUserId()).thenReturn(99L);
        AnalysisJobService contextualService = new AnalysisJobService(
                repository, receiptService, llmConfigService, extractor, pipeline,
                executor, transactionManager, Clock.fixed(NOW, ZoneOffset.UTC), ownershipContext);

        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(llmConfigService.entityForUser(99L)).thenReturn(config(false));
        when(pipeline.fromJson(any())).thenReturn(null);

        contextualService.launch(1L);
        executor.tasks.get(0).run();

        assertThat(launched.getStatus()).isEqualTo(AnalysisStatus.FAILED);
        assertThat(launched.getErrorMessage()).contains("désactivée");
        verify(llmConfigService).entityForUser(99L);
        verify(llmConfigService, never()).entity();
    }

    @Test
    @DisplayName("A missing receipt file marks the analysis FAILED")
    void missingFileFailsAnalysis() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        analysis.getReceipt().setPath(tempDir.resolve("absent.pdf").toString());
        stubNewAnalysis(analysis);
        when(llmConfigService.entity()).thenReturn(config(true));
        when(pipeline.fromJson(any())).thenReturn(null);

        service.launch(1L);
        executor.tasks.get(0).run();

        assertThat(launched.getStatus()).isEqualTo(AnalysisStatus.FAILED);
        assertThat(launched.getErrorMessage())
                .isEqualTo("Le fichier justificatif est introuvable sur le disque.");
        verify(extractor, never()).extract(any(Path.class), anyString(), anyInt());
    }

    @Test
    @DisplayName("A business extraction error is surfaced as the French failure message")
    void businessErrorFailsAnalysis() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(llmConfigService.entity()).thenReturn(config(true));
        when(extractor.extract(any(Path.class), anyString(), anyInt()))
                .thenThrow(new BusinessException("Document illisible : aucun texte exploitable."));
        when(pipeline.fromJson(any())).thenReturn(null);

        service.launch(1L);
        executor.tasks.get(0).run();

        assertThat(launched.getStatus()).isEqualTo(AnalysisStatus.FAILED);
        assertThat(launched.getErrorMessage())
                .isEqualTo("Document illisible : aucun texte exploitable.");
    }

    @Test
    @DisplayName("An unexpected failure hides the technical detail from the user")
    void unexpectedErrorFailsAnalysis() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(llmConfigService.entity()).thenReturn(config(true));
        when(extractor.extract(any(Path.class), anyString(), anyInt()))
                .thenThrow(new IllegalStateException("boom"));
        when(pipeline.fromJson(any())).thenReturn(null);

        service.launch(1L);
        executor.tasks.get(0).run();

        assertThat(launched.getStatus()).isEqualTo(AnalysisStatus.FAILED);
        assertThat(launched.getErrorMessage())
                .isEqualTo("L'analyse a échoué. Saisissez le montant manuellement.");
        assertThat(launched.getErrorMessage()).doesNotContain("boom");
    }

    @Test
    @DisplayName("A cancelled analysis is not overwritten by a late success")
    void cancelledDuringExecutionIsNotOverwritten() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(llmConfigService.entity()).thenReturn(config(true));
        when(extractor.extract(any(Path.class), anyString(), anyInt()))
                .thenReturn(new DocumentTextExtractor.Extraction("texte", List.of(), false, 1));
        when(pipeline.extract(any(LlmConfig.class), anyString(), anyList())).thenAnswer(invocation -> {
            launched.setStatus(AnalysisStatus.CANCELLED);
            return RESULT;
        });
        when(pipeline.fromJson(any())).thenReturn(null);

        service.launch(1L);
        executor.tasks.get(0).run();

        assertThat(launched.getStatus()).isEqualTo(AnalysisStatus.CANCELLED);
        assertThat(launched.getResultJson()).isNull();
    }

    @Test
    @DisplayName("A cancelled analysis is not overwritten by a late failure")
    void cancelledDuringFailureIsNotOverwritten() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(llmConfigService.entity()).thenReturn(config(true));
        when(extractor.extract(any(Path.class), anyString(), anyInt())).thenAnswer(invocation -> {
            launched.setStatus(AnalysisStatus.CANCELLED);
            throw new BusinessException("trop tard");
        });
        when(pipeline.fromJson(any())).thenReturn(null);

        service.launch(1L);
        executor.tasks.get(0).run();

        assertThat(launched.getStatus()).isEqualTo(AnalysisStatus.CANCELLED);
        assertThat(launched.getErrorMessage()).isNull();
    }

    @Test
    @DisplayName("A job whose analysis disappeared does nothing")
    void missingAnalysisDuringExecution() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(pipeline.fromJson(any())).thenReturn(null);

        service.launch(1L);
        when(repository.findWithReceiptById(42L)).thenReturn(Optional.empty());

        assertThatCode(() -> executor.tasks.get(0).run()).doesNotThrowAnyException();
        verify(llmConfigService, never()).entity();
    }

    @Test
    @DisplayName("A job whose analysis is no longer PENDING does nothing")
    void notPendingAnalysisIsIgnored() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(pipeline.fromJson(any())).thenReturn(null);

        service.launch(1L);
        launched.setStatus(AnalysisStatus.DONE);

        executor.tasks.get(0).run();

        verify(llmConfigService, never()).entity();
        assertThat(launched.getStatus()).isEqualTo(AnalysisStatus.DONE);
    }

    @Test
    @DisplayName("A database failure while starting the job marks it FAILED")
    void startFailureIsMarked() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(pipeline.fromJson(any())).thenReturn(null);

        service.launch(1L);
        when(repository.findWithReceiptById(42L))
                .thenThrow(new IllegalStateException("db down"))
                .thenReturn(Optional.of(launched));

        executor.tasks.get(0).run();

        assertThat(launched.getStatus()).isEqualTo(AnalysisStatus.FAILED);
        assertThat(launched.getErrorMessage())
                .isEqualTo("Impossible de démarrer l'analyse : db down");
    }

    @Test
    @DisplayName("A saturated executor marks the analysis FAILED immediately")
    void saturatedExecutorFailsAnalysis() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(repository.findById(42L)).thenAnswer(invocation -> Optional.ofNullable(launched));
        when(repository.findWithReceiptById(42L)).thenAnswer(invocation -> Optional.ofNullable(launched));
        when(pipeline.fromJson(any())).thenReturn(null);
        executor.reject = true;

        AnalysisDto dto = service.launch(1L);

        assertThat(dto.status()).isEqualTo("FAILED");
        assertThat(launched.getErrorMessage())
                .isEqualTo("Le service d'analyse est saturé. Réessayez dans un instant.");
    }

    @Test
    @DisplayName("Cancelling a running analysis stores CANCELLED")
    void cancelsRunningAnalysis() {
        AnalysisDocument analysis = analysis(AnalysisStatus.RUNNING);
        when(repository.findWithReceiptById(42L)).thenReturn(Optional.of(analysis));
        when(repository.save(any(AnalysisDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(pipeline.fromJson(any())).thenReturn(null);

        AnalysisDto dto = service.cancel(42L);

        assertThat(dto.status()).isEqualTo("CANCELLED");
        assertThat(dto.errorMessage()).isEqualTo("Analyse annulée par l'utilisateur.");
        assertThat(analysis.getUpdatedAt()).isEqualTo(NOW);
    }

    @Test
    @DisplayName("Cancelling a finished analysis is a business error")
    void cannotCancelFinishedAnalysis() {
        AnalysisDocument analysis = analysis(AnalysisStatus.DONE);
        when(repository.findWithReceiptById(42L)).thenReturn(Optional.of(analysis));

        assertThatThrownBy(() -> service.cancel(42L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Cette analyse est déjà terminée.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("ANALYSIS_ALREADY_FINISHED"));
    }

    @Test
    @DisplayName("An unknown analysis is reported in French")
    void unknownAnalysis() {
        when(repository.findWithReceiptById(42L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(42L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Analyse introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("ANALYSIS_NOT_FOUND"));
        assertThatThrownBy(() -> service.cancel(42L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Analyse introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("ANALYSIS_NOT_FOUND"));
    }

    @Test
    @DisplayName("Startup marks PENDING and RUNNING analyses as interrupted")
    void cleanInterruptedAnalyses() {
        AnalysisDocument pending = analysis(AnalysisStatus.PENDING);
        AnalysisDocument running = analysis(AnalysisStatus.RUNNING);
        when(repository.findByStatusIn(anyList())).thenReturn(List.of(pending, running));
        when(repository.save(any(AnalysisDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.cleanInterruptedAnalyses();

        assertThat(pending.getStatus()).isEqualTo(AnalysisStatus.FAILED);
        assertThat(running.getStatus()).isEqualTo(AnalysisStatus.FAILED);
        assertThat(pending.getErrorMessage())
                .isEqualTo("Analyse interrompue par un redémarrage. Relancez l'analyse.");
        assertThat(running.getUpdatedAt()).isEqualTo(NOW);
    }

    @Test
    @DisplayName("A finished job whose analysis disappeared is ignored")
    void finishWhenAnalysisDisappeared() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(llmConfigService.entity()).thenReturn(config(true));
        when(extractor.extract(any(Path.class), anyString(), anyInt()))
                .thenReturn(new DocumentTextExtractor.Extraction("texte", List.of(), false, 1));
        when(pipeline.extract(any(LlmConfig.class), anyString(), anyList())).thenReturn(RESULT);
        when(pipeline.fromJson(any())).thenReturn(null);

        service.launch(1L);
        when(repository.findWithReceiptById(42L))
                .thenReturn(Optional.of(launched))
                .thenReturn(Optional.empty());

        executor.tasks.get(0).run();

        assertThat(launched.getStatus()).isEqualTo(AnalysisStatus.RUNNING);
        assertThat(launched.getResultJson()).isNull();
    }

    @Test
    @DisplayName("A failed job whose analysis disappeared is ignored")
    void failureWhenAnalysisDisappeared() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(llmConfigService.entity()).thenReturn(config(true));
        when(extractor.extract(any(Path.class), anyString(), anyInt()))
                .thenThrow(new BusinessException("Document illisible."));
        when(pipeline.fromJson(any())).thenReturn(null);

        service.launch(1L);
        when(repository.findWithReceiptById(42L))
                .thenReturn(Optional.of(launched))
                .thenReturn(Optional.empty());

        executor.tasks.get(0).run();

        assertThat(launched.getStatus()).isEqualTo(AnalysisStatus.RUNNING);
        assertThat(launched.getErrorMessage()).isNull();
    }

    @Test
    @DisplayName("A saturated executor with an already deleted analysis keeps the launch result")
    void saturatedExecutorWithoutReload() {
        AnalysisDocument analysis = analysis(AnalysisStatus.PENDING);
        stubNewAnalysis(analysis);
        when(repository.findById(42L)).thenReturn(Optional.empty());
        when(repository.findWithReceiptById(42L)).thenAnswer(invocation -> Optional.ofNullable(launched));
        when(pipeline.fromJson(any())).thenReturn(null);
        executor.reject = true;

        AnalysisDto dto = service.launch(1L);

        assertThat(dto.status()).isEqualTo("PENDING");
        assertThat(launched.getErrorMessage()).isNull();
    }

    @Test
    @DisplayName("A missing result JSON yields a DTO without extraction")
    void toDtoWithoutResult() {
        AnalysisDocument analysis = analysis(AnalysisStatus.FAILED);
        analysis.setErrorMessage("Erreur");
        analysis.setResultJson(null);
        when(repository.findWithReceiptById(42L)).thenReturn(Optional.of(analysis));
        when(pipeline.fromJson(null)).thenReturn(null);

        AnalysisDto dto = service.get(42L);

        assertThat(dto.result()).isNull();
        assertThat(dto.errorMessage()).isEqualTo("Erreur");
    }

    private void stubNewAnalysis(AnalysisDocument analysis) {
        when(receiptService.entity(1L)).thenReturn(analysis.getReceipt());
        when(repository.findFirstByReceiptIdAndStatusInOrderByIdDesc(eq(1L), anyList()))
                .thenReturn(Optional.empty());
        AtomicReference<AnalysisDocument> saved = new AtomicReference<>();
        when(repository.save(any(AnalysisDocument.class))).thenAnswer(invocation -> {
            AnalysisDocument document = invocation.getArgument(0);
            document.setId(42L);
            saved.set(document);
            launched = document;
            return document;
        });
        when(repository.findWithReceiptById(42L)).thenAnswer(invocation -> Optional.ofNullable(saved.get()));
    }

    private AnalysisDocument analysis(AnalysisStatus status) {
        Receipt receipt = new Receipt();
        receipt.setId(1L);
        receipt.setFileName("facture.pdf");
        receipt.setMimeType("application/pdf");
        receipt.setPath(receiptFile.toString());
        receipt.setCreatedAt(NOW);

        AnalysisDocument analysis = new AnalysisDocument();
        analysis.setId(42L);
        analysis.setReceipt(receipt);
        analysis.setStatus(status);
        analysis.setCreatedAt(NOW);
        analysis.setUpdatedAt(NOW);
        return analysis;
    }

    private LlmConfig config(boolean active) {
        LlmConfig config = new LlmConfig();
        config.setActive(active);
        config.setUrl("http://localhost:11434");
        config.setModel("llama-test");
        config.setTimeoutSeconds(30);
        config.setMaxPages(5);
        config.setExtractionPrompt("Prompt");
        return config;
    }

    private static final class CapturingExecutor extends ThreadPoolTaskExecutor {

        private final List<Runnable> tasks = new ArrayList<>();
        private boolean reject;

        @Override
        public void execute(Runnable task) {
            if (reject) {
                throw new IllegalStateException("saturated");
            }
            tasks.add(task);
        }
    }
}
