package fr.hkof.homeofficeexpenses.config;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.TemplateFormat;
import fr.hkof.homeofficeexpenses.domain.LlmProvider;
import fr.hkof.homeofficeexpenses.domain.LlmConfig;
import fr.hkof.homeofficeexpenses.domain.Settings;
import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.repository.LlmConfigRepository;
import fr.hkof.homeofficeexpenses.repository.SettingsRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;
import fr.hkof.homeofficeexpenses.service.llm.DefaultPrompt;

@Component
public class DataInitializer implements ApplicationRunner {

    private final SettingsRepository settingsRepository;
    private final ExpenseItemRepository expenseItemRepository;
    private final TemplateDocumentRepository templateRepository;
    private final LlmConfigRepository llmConfigRepository;
    private final AppProperties properties;
    private final Clock clock;

    public DataInitializer(SettingsRepository settingsRepository, ExpenseItemRepository expenseItemRepository,
            TemplateDocumentRepository templateRepository, LlmConfigRepository llmConfigRepository,
            AppProperties properties, Clock clock) {
        this.settingsRepository = settingsRepository;
        this.expenseItemRepository = expenseItemRepository;
        this.templateRepository = templateRepository;
        this.llmConfigRepository = llmConfigRepository;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        initSettings();
        initItems();
        initTemplates();
        initLlm();
    }

    private void initSettings() {
        if (settingsRepository.existsById(1L)) {
            return;
        }
        Settings settings = new Settings();
        settings.setId(1L);
        settings.setCompanyName("HKOF");
        settings.setLegalForm("EURL");
        settings.setSiren("000 000 000");
        settings.setCompanyAddress("12 rue de la République, 75000 Paris");
        settings.setManagerName("Gérant");
        settings.setHomeAddress("12 rue de la République, 75000 Paris");
        settings.setTotalArea(new BigDecimal("70.00"));
        settings.setBusinessArea(new BigDecimal("25.00"));
        settings.setLandlordName("Nom du bailleur");
        settings.setLandlordAddress("Adresse du bailleur");
        settings.setTenantName("Nom du locataire");
        settings.setTenantAddress("Adresse du locataire");
        settings.setRentExclCharges(new BigDecimal("1300.00"));
        settings.setChargesAdvance(new BigDecimal("0.00"));
        settings.setIssuePlace("Paris");
        settings.setUpdatedAt(Instant.now(clock));
        settingsRepository.save(settings);
    }

    private void initItems() {
        createExpenseItemIfAbsent("loyer", "Quittance de loyer", null, "100.00", "MONTHLY", 10);
        createExpenseItemIfAbsent("gaz", "Gaz", "EDF", "35.71", "MONTHLY", 20);
        createExpenseItemIfAbsent("electricite", "Électricité", "Primeo", "35.71", "MONTHLY", 30);
        createExpenseItemIfAbsent("assurance", "Assurance habitation", null, "35.71", "ANNUAL", 40);
        createExpenseItemIfAbsent("telephone", "Téléphone", null, "35.71", "MONTHLY", 50);
        createExpenseItemIfAbsent("fibre", "Fibre internet", null, "35.71", "MONTHLY", 60);
    }

    private void createExpenseItemIfAbsent(String code, String label, String supplier, String proRataPct,
            String periodicity, int sortOrder) {
        if (expenseItemRepository.findFirstByCode(code).isPresent()) {
            return;
        }
        ExpenseItem expenseItem = new ExpenseItem();
        expenseItem.setCode(code);
        expenseItem.setLabel(label);
        expenseItem.setSupplier(supplier);
        expenseItem.setProRataPct(new BigDecimal(proRataPct));
        expenseItem.setPeriodicity(fr.hkof.homeofficeexpenses.domain.Periodicity.valueOf(periodicity));
        expenseItem.setActive(true);
        expenseItem.setSortOrder(sortOrder);
        expenseItem.setMultipleLinesAllowed(false);
        expenseItem.setDeleted(false);
        expenseItemRepository.save(expenseItem);
    }

    private void initTemplates() {
        for (TemplateType type : TemplateType.values()) {
            TemplateDocument builtIn = templateRepository.findFirstByTypeAndBuiltInTrueAndDeletedFalse(type)
                    .orElseGet(() -> {
                        TemplateDocument template = new TemplateDocument();
                        template.setType(type);
                        template.setName(type == TemplateType.RENT_RECEIPT
                                ? "Quittance — modèle intégré"
                                : "Note de frais — modèle intégré");
                        template.setVersion(1);
                        template.setFormat(TemplateFormat.HTML);
                        template.setPath(type == TemplateType.RENT_RECEIPT
                                ? "classpath:templates/defaut/quittance.html"
                                : "classpath:templates/defaut/note-frais.html");
                        template.setBuiltIn(true);
                        template.setDeleted(false);
                        template.setActive(false);
                        template.setCreatedAt(Instant.now(clock));
                        return templateRepository.save(template);
                    });
            if (templateRepository.findFirstByTypeAndActiveTrueAndDeletedFalse(type).isEmpty()) {
                builtIn.setActive(true);
                templateRepository.save(builtIn);
            }
        }
    }

    private void initLlm() {
        if (llmConfigRepository.existsById(1L)) {
            return;
        }
        LlmConfig config = new LlmConfig();
        config.setId(1L);
        config.setActive(true);
        config.setSupplier(LlmProvider.OLLAMA);
        config.setUrl(properties.llm().defaultUrl());
        config.setModel(properties.llm().defaultModel());
        config.setTimeoutSeconds(120);
        config.setTemperature(BigDecimal.ZERO);
        config.setNumCtx(8192);
        config.setMaxPages(5);
        config.setOcrActive(false);
        config.setExtractionPrompt(DefaultPrompt.SYSTEM);
        config.setUpdatedAt(Instant.now(clock));
        llmConfigRepository.save(config);
    }
}
