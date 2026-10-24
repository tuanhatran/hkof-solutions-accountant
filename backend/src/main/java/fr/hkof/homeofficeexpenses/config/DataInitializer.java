package fr.hkof.homeofficeexpenses.config;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Employee;
import fr.hkof.homeofficeexpenses.domain.EmployeeTitle;
import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.Landlord;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.LlmConfig;
import fr.hkof.homeofficeexpenses.domain.LlmProvider;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateFormat;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.domain.Tenant;
import fr.hkof.homeofficeexpenses.repository.CompanyRepository;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.repository.LandlordRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.LlmConfigRepository;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;
import fr.hkof.homeofficeexpenses.repository.TenantRepository;
import fr.hkof.homeofficeexpenses.service.llm.DefaultPrompt;

@Component
public class DataInitializer implements ApplicationRunner {

    private static final String DEFAULT_COMPANY_NAME = "HKOF";
    private static final String DEFAULT_HOME_ADDRESS = "12 rue de la République, 75000 Paris";
    private static final String DEFAULT_LANDLORD_NAME = "Nom du bailleur";
    private static final String DEFAULT_LANDLORD_ADDRESS = "Adresse du bailleur";
    private static final String DEFAULT_TENANT_NAME = "Nom du locataire";
    private static final String DEFAULT_TENANT_ADDRESS = "Adresse du locataire";
    private static final String DEFAULT_RENT_EXCL_CHARGES = "1300.00";
    private static final String DEFAULT_CHARGES = "0.00";

    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final LandlordRepository landlordRepository;
    private final TenantRepository tenantRepository;
    private final LeaseRepository leaseRepository;
    private final ExpenseItemRepository expenseItemRepository;
    private final TemplateDocumentRepository templateRepository;
    private final LlmConfigRepository llmConfigRepository;
    private final AppProperties properties;
    private final Clock clock;

    public DataInitializer(CompanyRepository companyRepository, EmployeeRepository employeeRepository,
            LandlordRepository landlordRepository, TenantRepository tenantRepository,
            LeaseRepository leaseRepository, ExpenseItemRepository expenseItemRepository,
            TemplateDocumentRepository templateRepository, LlmConfigRepository llmConfigRepository,
            AppProperties properties, Clock clock) {
        this.companyRepository = companyRepository;
        this.employeeRepository = employeeRepository;
        this.landlordRepository = landlordRepository;
        this.tenantRepository = tenantRepository;
        this.leaseRepository = leaseRepository;
        this.expenseItemRepository = expenseItemRepository;
        this.templateRepository = templateRepository;
        this.llmConfigRepository = llmConfigRepository;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Company company = initCompany();
        initEmployees(company);
        initRentConfiguration(company);
        initItems(company);
        initTemplates();
        initLlm();
    }

    private Company initCompany() {
        return companyRepository.findFirstByDeletedFalseOrderByIdAsc()
                .orElseGet(this::createDefaultCompany);
    }

    private Company createDefaultCompany() {
        Company company = new Company();
        company.setName(DEFAULT_COMPANY_NAME);
        company.setLegalForm("EURL");
        company.setSiren("000 000 000");
        company.setAddress(DEFAULT_HOME_ADDRESS);
        company.setManagerName("Gérant");
        company.setHomeAddress(DEFAULT_HOME_ADDRESS);
        company.setTotalArea(new BigDecimal("70.00"));
        company.setBusinessArea(new BigDecimal("25.00"));
        company.setIssuePlace("Paris");
        company.setDeleted(false);
        company.setCreatedAt(Instant.now(clock));
        company.setUpdatedAt(Instant.now(clock));
        return companyRepository.save(company);
    }

    private void initEmployees(Company company) {
        if (employeeRepository.findFirstByCompanyIdAndDeletedFalseOrderByIdAsc(company.getId()).isPresent()) {
            return;
        }
        Employee ceo = new Employee();
        ceo.setCompanyId(company.getId());
        ceo.setFirstName(company.getManagerName() == null || company.getManagerName().isBlank()
                ? "Gérant"
                : company.getManagerName());
        ceo.setLastName("");
        ceo.setTitle(EmployeeTitle.CEO);
        ceo.setDeleted(false);
        ceo.setCreatedAt(Instant.now(clock));
        employeeRepository.save(ceo);
    }

    private void initRentConfiguration(Company company) {
        Landlord landlord = landlordRepository.findFirstByDeletedFalseOrderByNameAsc()
                .orElseGet(this::createDefaultLandlord);
        Tenant tenant = tenantRepository.findFirstByDeletedFalseOrderByNameAsc()
                .orElseGet(this::createDefaultTenant);
        if (leaseRepository.findFirstByDeletedFalseOrderByIdAsc().isPresent()) {
            return;
        }
        Lease lease = new Lease();
        lease.setLandlord(landlord);
        lease.setTenant(tenant);
        lease.setCompanyId(company.getId());
        lease.setPropertyAddress(DEFAULT_HOME_ADDRESS);
        lease.setRentExclCharges(new BigDecimal(DEFAULT_RENT_EXCL_CHARGES));
        lease.setCharges(new BigDecimal(DEFAULT_CHARGES));
        lease.setDeleted(false);
        lease.setCreatedAt(Instant.now(clock));
        leaseRepository.save(lease);
    }

    private Landlord createDefaultLandlord() {
        Landlord landlord = new Landlord();
        landlord.setName(DEFAULT_LANDLORD_NAME);
        landlord.setAddress(DEFAULT_LANDLORD_ADDRESS);
        landlord.setDeleted(false);
        landlord.setCreatedAt(Instant.now(clock));
        return landlordRepository.save(landlord);
    }

    private Tenant createDefaultTenant() {
        Tenant tenant = new Tenant();
        tenant.setName(DEFAULT_TENANT_NAME);
        tenant.setAddress(DEFAULT_TENANT_ADDRESS);
        tenant.setDeleted(false);
        tenant.setCreatedAt(Instant.now(clock));
        return tenantRepository.save(tenant);
    }

    private void initItems(Company company) {
        createExpenseItemIfAbsent(company, "loyer", "Quittance de loyer", null, "100.00", "MONTHLY", 10);
        createExpenseItemIfAbsent(company, "gaz", "Gaz", "EDF", "35.71", "MONTHLY", 20);
        createExpenseItemIfAbsent(company, "electricite", "Électricité", "Primeo", "35.71", "MONTHLY", 30);
        createExpenseItemIfAbsent(company, "assurance", "Assurance habitation", null, "35.71", "ANNUAL", 40);
        createExpenseItemIfAbsent(company, "telephone", "Téléphone", null, "35.71", "MONTHLY", 50);
        createExpenseItemIfAbsent(company, "fibre", "Fibre internet", null, "35.71", "MONTHLY", 60);
    }

    private void createExpenseItemIfAbsent(Company company, String code, String label, String supplier,
            String proRataPct, String periodicity, int sortOrder) {
        if (expenseItemRepository.findFirstByCompanyIdAndCode(company.getId(), code).isPresent()) {
            return;
        }
        ExpenseItem expenseItem = new ExpenseItem();
        expenseItem.setCompanyId(company.getId());
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
