package fr.hkof.homeofficeexpenses.config;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;

import org.springframework.boot.ApplicationArguments;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Address;
import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Employee;
import fr.hkof.homeofficeexpenses.domain.EmployeeTitle;
import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.LlmConfig;
import fr.hkof.homeofficeexpenses.domain.LlmProvider;
import fr.hkof.homeofficeexpenses.domain.Person;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateFormat;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.repository.AddressRepository;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;
import fr.hkof.homeofficeexpenses.repository.CompanyRepository;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.LlmConfigRepository;
import fr.hkof.homeofficeexpenses.repository.PersonRepository;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;
import fr.hkof.homeofficeexpenses.service.llm.DefaultPrompt;

@Component
public class DataInitializer implements ApplicationRunner {

    private static final String DEFAULT_COMPANY_NAME = "HKOF";
    private static final String DEFAULT_HOME_ADDRESS = "12 rue de la République, 75000 Paris";
    private static final String DEFAULT_LANDLORD_NAME = "Nom du bailleur";
    private static final String DEFAULT_LANDLORD_ADDRESS = "Adresse du bailleur";
    private static final String DEFAULT_RENT_EXCL_CHARGES = "1300.00";
    private static final String DEFAULT_CHARGES = "0.00";
    private static final String SEED_USER_EMAIL = "thtran@homeofficeexpenses.local";
    private static final String SEED_USER_PASSWORD = "thtran";
    private static final String E2E_USER_EMAIL = "e2e@homeofficeexpenses.local";
    private static final String E2E_USER_PASSWORD = "e2e-password";

    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final PersonRepository personRepository;
    private final LeaseRepository leaseRepository;
    private final AddressRepository addressRepository;
    private final ExpenseItemRepository expenseItemRepository;
    private final TemplateDocumentRepository templateRepository;
    private final LlmConfigRepository llmConfigRepository;
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;
    private final AppProperties properties;
    private final Clock clock;

    public DataInitializer(CompanyRepository companyRepository, EmployeeRepository employeeRepository,
            PersonRepository personRepository, LeaseRepository leaseRepository, AddressRepository addressRepository,
            ExpenseItemRepository expenseItemRepository, TemplateDocumentRepository templateRepository,
            LlmConfigRepository llmConfigRepository, AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder, Environment environment, AppProperties properties, Clock clock) {
        this.companyRepository = companyRepository;
        this.employeeRepository = employeeRepository;
        this.personRepository = personRepository;
        this.leaseRepository = leaseRepository;
        this.addressRepository = addressRepository;
        this.expenseItemRepository = expenseItemRepository;
        this.templateRepository = templateRepository;
        this.llmConfigRepository = llmConfigRepository;
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.environment = environment;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        initUsers();
        seedData(seedOwnerId());
    }

    /** Seeds the documented configuration owned by the given account; used by the e2e reset. */
    @Transactional
    public void seed(Long ownerId) {
        initUsers();
        seedData(ownerId);
    }

    private void seedData(Long ownerId) {
        Company company = initCompany(ownerId);
        initEmployees(ownerId, company);
        initRentConfiguration(ownerId, company);
        initItems(ownerId, company);
        initTemplates();
        initLlm();
    }

    private Long seedOwnerId() {
        return appUserRepository.findByEmailIgnoreCase(SEED_USER_EMAIL)
                .orElseThrow(() -> new IllegalStateException("Seeded owner account is missing"))
                .getId();
    }

    private void initUsers() {
        createUserIfAbsent(SEED_USER_EMAIL, SEED_USER_PASSWORD, true);
        if (environment.matchesProfiles("e2e")) {
            createUserIfAbsent(E2E_USER_EMAIL, E2E_USER_PASSWORD, false);
        }
    }

    private void createUserIfAbsent(String email, String rawPassword, boolean mustChangePassword) {
        if (appUserRepository.existsByEmailIgnoreCase(email)) {
            return;
        }
        Instant now = Instant.now(clock);
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setConfirmed(true);
        user.setMustChangePassword(mustChangePassword);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        appUserRepository.save(user);
    }

    private Company initCompany(Long ownerId) {
        return companyRepository.findFirstByUserIdAndDeletedFalseOrderByIdAsc(ownerId)
                .orElseGet(() -> createDefaultCompany(ownerId));
    }

    private Company createDefaultCompany(Long ownerId) {
        Company company = new Company();
        company.setUserId(ownerId);
        company.setName(DEFAULT_COMPANY_NAME);
        company.setLegalForm("EURL");
        company.setSiren("000 000 000");
        company.setAddress(DEFAULT_HOME_ADDRESS);
        company.setManagerName("Gérant");
        company.setIssuePlace("Paris");
        company.setDeleted(false);
        company.setCreatedAt(Instant.now(clock));
        company.setUpdatedAt(Instant.now(clock));
        return companyRepository.save(company);
    }

    private void initEmployees(Long ownerId, Company company) {
        if (employeeRepository
                .findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(ownerId, company.getId())
                .isPresent()) {
            return;
        }
        Employee ceo = new Employee();
        ceo.setUserId(ownerId);
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

    private void initRentConfiguration(Long ownerId, Company company) {
        Person landlord = personRepository.findAllNaturalPersons(ownerId).stream().findFirst()
                .orElseGet(() -> createDefaultPerson(ownerId));
        if (leaseRepository.findFirstByUserIdAndDeletedFalseOrderByIdAsc(ownerId).isPresent()) {
            return;
        }
        Address address = addressRepository
                .findFirstByUserIdAndDeletedFalseAndLabelIgnoreCase(ownerId, DEFAULT_HOME_ADDRESS)
                .orElseGet(() -> createDefaultAddress(ownerId));
        Lease lease = new Lease();
        lease.setUserId(ownerId);
        lease.setLandlord(landlord);
        lease.setTenant(null);
        lease.setCompanyId(company.getId());
        lease.setCompanyLease(true);
        lease.setTotalArea(new BigDecimal("70.00"));
        lease.setBusinessArea(new BigDecimal("25.00"));
        lease.setAddress(address);
        lease.setRentExclCharges(new BigDecimal(DEFAULT_RENT_EXCL_CHARGES));
        lease.setCharges(new BigDecimal(DEFAULT_CHARGES));
        lease.setDeleted(false);
        lease.setCreatedAt(Instant.now(clock));
        leaseRepository.save(lease);
    }

    private Person createDefaultPerson(Long ownerId) {
        Person person = new Person();
        person.setUserId(ownerId);
        person.setName(DEFAULT_LANDLORD_NAME);
        person.setAddress(DEFAULT_LANDLORD_ADDRESS);
        person.setDeleted(false);
        person.setCreatedAt(Instant.now(clock));
        person.setUpdatedAt(Instant.now(clock));
        return personRepository.save(person);
    }

    private Address createDefaultAddress(Long ownerId) {
        Address address = new Address();
        address.setUserId(ownerId);
        address.setLabel(DEFAULT_HOME_ADDRESS);
        address.setDeleted(false);
        address.setCreatedAt(Instant.now(clock));
        return addressRepository.save(address);
    }

    private void initItems(Long ownerId, Company company) {
        createExpenseItemIfAbsent(ownerId, company, "loyer", "Quittance de loyer", null, "100.00", "MONTHLY", 10);
        createExpenseItemIfAbsent(ownerId, company, "gaz", "Gaz", "EDF", "35.71", "MONTHLY", 20);
        createExpenseItemIfAbsent(ownerId, company, "electricite", "Électricité", "Primeo", "35.71", "MONTHLY", 30);
        createExpenseItemIfAbsent(ownerId, company, "assurance", "Assurance habitation", null, "35.71", "ANNUAL", 40);
        createExpenseItemIfAbsent(ownerId, company, "telephone", "Téléphone", null, "35.71", "MONTHLY", 50);
        createExpenseItemIfAbsent(ownerId, company, "fibre", "Fibre internet", null, "35.71", "MONTHLY", 60);
    }

    private void createExpenseItemIfAbsent(Long ownerId, Company company, String code, String label,
            String supplier, String proRataPct, String periodicity, int sortOrder) {
        if (expenseItemRepository.findFirstByUserIdAndCompanyIdAndCode(ownerId, company.getId(), code).isPresent()) {
            return;
        }
        ExpenseItem expenseItem = new ExpenseItem();
        expenseItem.setUserId(ownerId);
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
