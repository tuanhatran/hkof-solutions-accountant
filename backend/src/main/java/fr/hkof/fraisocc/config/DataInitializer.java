package fr.hkof.fraisocc.config;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.fraisocc.domain.FormatTemplate;
import fr.hkof.fraisocc.domain.FournisseurLlm;
import fr.hkof.fraisocc.domain.LlmConfig;
import fr.hkof.fraisocc.domain.Parametres;
import fr.hkof.fraisocc.domain.Poste;
import fr.hkof.fraisocc.domain.TemplateDocument;
import fr.hkof.fraisocc.domain.TypeTemplate;
import fr.hkof.fraisocc.repository.LlmConfigRepository;
import fr.hkof.fraisocc.repository.ParametresRepository;
import fr.hkof.fraisocc.repository.PosteRepository;
import fr.hkof.fraisocc.repository.TemplateDocumentRepository;
import fr.hkof.fraisocc.service.llm.DefaultPrompt;

@Component
public class DataInitializer implements ApplicationRunner {

    private final ParametresRepository parametresRepository;
    private final PosteRepository posteRepository;
    private final TemplateDocumentRepository templateRepository;
    private final LlmConfigRepository llmConfigRepository;
    private final AppProperties properties;
    private final Clock clock;

    public DataInitializer(ParametresRepository parametresRepository, PosteRepository posteRepository,
            TemplateDocumentRepository templateRepository, LlmConfigRepository llmConfigRepository,
            AppProperties properties, Clock clock) {
        this.parametresRepository = parametresRepository;
        this.posteRepository = posteRepository;
        this.templateRepository = templateRepository;
        this.llmConfigRepository = llmConfigRepository;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        initialiserParametres();
        initialiserPostes();
        initialiserTemplates();
        initialiserLlm();
    }

    private void initialiserParametres() {
        if (parametresRepository.existsById(1L)) {
            return;
        }
        Parametres p = new Parametres();
        p.setId(1L);
        p.setRaisonSociale("HKOF");
        p.setFormeJuridique("EURL");
        p.setSiren("000 000 000");
        p.setSocieteAdresse("12 rue de la République, 75000 Paris");
        p.setGerant("Gérant");
        p.setLogementAdresse("12 rue de la République, 75000 Paris");
        p.setSurfaceTotale(new BigDecimal("70.00"));
        p.setSurfacePro(new BigDecimal("25.00"));
        p.setBailleurNom("Nom du bailleur");
        p.setBailleurAdresse("Adresse du bailleur");
        p.setLocataireNom("Nom du locataire");
        p.setLocataireAdresse("Adresse du locataire");
        p.setLoyerHc(new BigDecimal("900.00"));
        p.setProvisionCharges(new BigDecimal("50.00"));
        p.setLieuEmission("Paris");
        p.setUpdatedAt(Instant.now(clock));
        parametresRepository.save(p);
    }

    private void initialiserPostes() {
        creerPosteSiAbsent("loyer", "Quittance de loyer", null, "100.00", "MENSUELLE", 10);
        creerPosteSiAbsent("gaz", "Gaz", "EDF", "35.71", "BIMESTRIELLE", 20);
        creerPosteSiAbsent("electricite", "Électricité", "Primeo", "35.71", "BIMESTRIELLE", 30);
        creerPosteSiAbsent("assurance", "Assurance habitation", null, "35.71", "ANNUELLE", 40);
        creerPosteSiAbsent("telephone", "Téléphone", null, "35.71", "MENSUELLE", 50);
        creerPosteSiAbsent("fibre", "Fibre internet", null, "35.71", "MENSUELLE", 60);
    }

    private void creerPosteSiAbsent(String code, String libelle, String fournisseur, String prorata,
            String periodicite, int ordre) {
        if (posteRepository.findFirstByCode(code).isPresent()) {
            return;
        }
        Poste poste = new Poste();
        poste.setCode(code);
        poste.setLibelle(libelle);
        poste.setFournisseur(fournisseur);
        poste.setProrataPct(new BigDecimal(prorata));
        poste.setPeriodicite(fr.hkof.fraisocc.domain.Periodicite.valueOf(periodicite));
        poste.setActif(true);
        poste.setOrdre(ordre);
        poste.setPlusieursLignesAutorisees(false);
        poste.setSupprime(false);
        posteRepository.save(poste);
    }

    private void initialiserTemplates() {
        for (TypeTemplate type : TypeTemplate.values()) {
            TemplateDocument integre = templateRepository.findFirstByTypeAndIntegreTrueAndSupprimeFalse(type)
                    .orElseGet(() -> {
                        TemplateDocument t = new TemplateDocument();
                        t.setType(type);
                        t.setNom(type == TypeTemplate.QUITTANCE
                                ? "Quittance — modèle intégré"
                                : "Note de frais — modèle intégré");
                        t.setVersion(1);
                        t.setFormat(FormatTemplate.HTML);
                        t.setChemin(type == TypeTemplate.QUITTANCE
                                ? "classpath:templates/defaut/quittance.html"
                                : "classpath:templates/defaut/note-frais.html");
                        t.setIntegre(true);
                        t.setSupprime(false);
                        t.setActif(false);
                        t.setCreatedAt(Instant.now(clock));
                        return templateRepository.save(t);
                    });
            if (templateRepository.findFirstByTypeAndActifTrueAndSupprimeFalse(type).isEmpty()) {
                integre.setActif(true);
                templateRepository.save(integre);
            }
        }
    }

    private void initialiserLlm() {
        if (llmConfigRepository.existsById(1L)) {
            return;
        }
        LlmConfig config = new LlmConfig();
        config.setId(1L);
        config.setActif(true);
        config.setFournisseur(FournisseurLlm.OLLAMA);
        config.setUrl(properties.llm().defaultUrl());
        config.setModele(properties.llm().defaultModel());
        config.setTimeoutSeconds(120);
        config.setTemperature(BigDecimal.ZERO);
        config.setNumCtx(8192);
        config.setPagesMax(5);
        config.setOcrActif(false);
        config.setPromptExtraction(DefaultPrompt.SYSTEM);
        config.setUpdatedAt(Instant.now(clock));
        llmConfigRepository.save(config);
    }
}
