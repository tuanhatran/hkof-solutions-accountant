package fr.hkof.homeofficeexpenses.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.config.DataInitializer;
import fr.hkof.homeofficeexpenses.domain.Address;
import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Employee;
import fr.hkof.homeofficeexpenses.domain.EmployeeTitle;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.Person;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.repository.AddressRepository;
import fr.hkof.homeofficeexpenses.repository.AnalysisDocumentRepository;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;
import fr.hkof.homeofficeexpenses.repository.CompanyRepository;
import fr.hkof.homeofficeexpenses.repository.DocumentDraftRepository;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseLineRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseStatementRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseTenantRepository;
import fr.hkof.homeofficeexpenses.repository.LlmConfigRepository;
import fr.hkof.homeofficeexpenses.repository.PersonRepository;
import fr.hkof.homeofficeexpenses.repository.ReceiptRepository;
import fr.hkof.homeofficeexpenses.repository.RentReceiptAdditionalChargeRepository;
import fr.hkof.homeofficeexpenses.repository.RentReceiptRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;

@Service
@Profile("e2e")
public class E2eResetService {

    private static final List<String> FOLDERS = List.of("justificatifs", "sorties", "templates");

    private static final String DEFAULT_LANDLORD_NAME = "Nom du bailleur";
    private static final String DEFAULT_TENANT_NAME = "Nom du locataire";
    private static final String DEFAULT_TENANT_ADDRESS = "Adresse du locataire";
    private static final String DEFAULT_LEASE_ADDRESS = "12 rue de la République, 75000 Paris";
    private static final String DEFAULT_LANDLORD_ISSUE_PLACE = "Paris";
    private static final String DEFAULT_RENT_EXCL_CHARGES = "1300.00";
    private static final String DEFAULT_CHARGES = "0.00";
    private static final String SEED_USER_EMAIL = "thtran@homeofficeexpenses.local";
    private static final String SEED_USER_PASSWORD = "thtran";
    private static final String E2E_USER_EMAIL = "e2e@homeofficeexpenses.local";
    private static final String E2E_USER_PASSWORD = "e2e-password";

    /** Synthetic 1x1 PNG, never a real personal signature. */
    private static final byte[] DEFAULT_SIGNATURE_PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=");

    private final AnalysisDocumentRepository analyses;
    private final DocumentDraftRepository drafts;
    private final ExpenseLineRepository lines;
    private final ExpenseStatementRepository statements;
    private final RentReceiptRepository rentReceipts;
    private final RentReceiptAdditionalChargeRepository additionalCharges;
    private final ReceiptRepository receipts;
    private final TemplateDocumentRepository templates;
    private final LlmConfigRepository llmConfigs;
    private final ExpenseItemRepository items;
    private final CompanyRepository companies;
    private final EmployeeRepository employees;
    private final LeaseRepository leases;
    private final LeaseTenantRepository leaseTenants;
    private final AddressRepository addresses;
    private final PersonRepository persons;
    private final SignatureRepository signatures;
    private final StorageService storage;
    private final DataInitializer initializer;
    private final AuthService authService;
    private final AppUserRepository appUsers;

    public E2eResetService(AnalysisDocumentRepository analyses, DocumentDraftRepository drafts,
            ExpenseLineRepository lines,
            ExpenseStatementRepository statements, RentReceiptRepository rentReceipts,
            RentReceiptAdditionalChargeRepository additionalCharges, ReceiptRepository receipts,
            TemplateDocumentRepository templates, LlmConfigRepository llmConfigs, ExpenseItemRepository items,
            CompanyRepository companies, EmployeeRepository employees, LeaseRepository leases,
            LeaseTenantRepository leaseTenants, AddressRepository addresses, PersonRepository persons,
            SignatureRepository signatures, StorageService storage, DataInitializer initializer,
            AuthService authService, AppUserRepository appUsers) {
        this.analyses = analyses;
        this.drafts = drafts;
        this.lines = lines;
        this.statements = statements;
        this.rentReceipts = rentReceipts;
        this.additionalCharges = additionalCharges;
        this.receipts = receipts;
        this.templates = templates;
        this.llmConfigs = llmConfigs;
        this.items = items;
        this.companies = companies;
        this.employees = employees;
        this.leases = leases;
        this.leaseTenants = leaseTenants;
        this.addresses = addresses;
        this.persons = persons;
        this.signatures = signatures;
        this.storage = storage;
        this.initializer = initializer;
        this.authService = authService;
        this.appUsers = appUsers;
    }

    @Transactional
    public void reset() {
        signatures.deleteAllInBatch();
        drafts.deleteAllInBatch();
        analyses.deleteAllInBatch();
        lines.deleteAllInBatch();
        statements.deleteAllInBatch();
        additionalCharges.deleteAllInBatch();
        rentReceipts.deleteAllInBatch();
        receipts.deleteAllInBatch();
        templates.deleteAllInBatch();
        llmConfigs.deleteAllInBatch();
        items.deleteAllInBatch();
        leaseTenants.deleteAllInBatch();
        leases.deleteAllInBatch();
        addresses.deleteAllInBatch();
        employees.deleteAllInBatch();
        persons.deleteAllInBatch();
        companies.deleteAllInBatch();
        cleanFiles();
        Long e2eOwner = appUsers.findByEmailIgnoreCase(E2E_USER_EMAIL).orElseThrow().getId();
        initializer.seed(e2eOwner);
        authService.restoreSeedUser(SEED_USER_EMAIL, SEED_USER_PASSWORD, true);
        authService.restoreSeedUser(E2E_USER_EMAIL, E2E_USER_PASSWORD, false);
        Person landlord = naturalPerson(e2eOwner, DEFAULT_LANDLORD_NAME);
        // Synthetic issue place so a person lease still renders "Fait à" in e2e.
        if (landlord != null) {
            landlord.setIssuePlace(DEFAULT_LANDLORD_ISSUE_PLACE);
            persons.save(landlord);
        }
        Person tenant = seedTenant(e2eOwner);
        seedNormalLease(e2eOwner, landlord, tenant);
        seedSignatures(e2eOwner, landlord, tenant);
    }

    /** Adds the natural person tenant missing from the base seed. */
    private Person seedTenant(Long ownerId) {
        Person existing = naturalPerson(ownerId, DEFAULT_TENANT_NAME);
        if (existing != null) {
            return existing;
        }
        Instant now = Instant.now();
        Person tenant = new Person();
        tenant.setUserId(ownerId);
        tenant.setName(DEFAULT_TENANT_NAME);
        tenant.setAddress(DEFAULT_TENANT_ADDRESS);
        tenant.setDeleted(false);
        tenant.setCreatedAt(now);
        tenant.setUpdatedAt(now);
        return persons.save(tenant);
    }

    /** Adds a normal lease next to the base company lease, so both shapes are available in e2e. */
    private void seedNormalLease(Long ownerId, Person landlord, Person tenant) {
        if (landlord == null || tenant == null
                || leases.findFirstByUserIdAndLandlordIdAndTenantIdAndDeletedFalse(
                        ownerId, landlord.getId(), tenant.getId()).isPresent()) {
            return;
        }
        Address address = addresses
                .findFirstByUserIdAndDeletedFalseAndLabelIgnoreCase(ownerId, DEFAULT_LEASE_ADDRESS)
                .orElseGet(() -> createLeaseAddress(ownerId));
        Lease lease = new Lease();
        lease.setUserId(ownerId);
        lease.setLandlord(landlord);
        lease.setTenant(tenant);
        lease.setCompanyLease(false);
        lease.setAddress(address);
        lease.setRentExclCharges(new BigDecimal(DEFAULT_RENT_EXCL_CHARGES));
        lease.setCharges(new BigDecimal(DEFAULT_CHARGES));
        lease.setDeleted(false);
        lease.setCreatedAt(Instant.now());
        leases.save(lease);
    }

    private Address createLeaseAddress(Long ownerId) {
        Address address = new Address();
        address.setUserId(ownerId);
        address.setLabel(DEFAULT_LEASE_ADDRESS);
        address.setDeleted(false);
        address.setCreatedAt(Instant.now());
        return addresses.save(address);
    }

    private Person naturalPerson(Long ownerId, String name) {
        return persons.findAllNaturalPersons(ownerId).stream()
                .filter(person -> name.equals(person.getName()))
                .findFirst()
                .orElse(null);
    }

    private void seedSignatures(Long ownerId, Person landlord, Person tenant) {
        Instant now = Instant.now();
        Company company = companies.findFirstByUserIdAndDeletedFalseOrderByIdAsc(ownerId).orElse(null);
        Long companyId = company == null ? null : company.getId();
        Employee ceo = company == null ? null
                : employees.findFirstByUserIdAndCompanyIdAndTitleAndDeletedFalseOrderByIdAsc(
                        ownerId, companyId, EmployeeTitle.CEO).orElse(null);
        saveSignature(ownerId, landlord == null ? null : landlord.getId(), "Signature du bailleur (e2e)",
                "signature-bailleur-e2e.png", now);
        saveSignature(ownerId, tenant == null ? null : tenant.getId(), "Signature du locataire (e2e)",
                "signature-locataire-e2e.png", now);
        saveSignature(ownerId, ceo == null ? null : ceo.getId(), "Signature du gérant (e2e)",
                "signature-gerant-e2e.png", now);
    }

    private void saveSignature(Long ownerId, Long personId, String name, String fileName, Instant createdAt) {
        if (personId == null) {
            return;
        }
        Signature signature = new Signature();
        signature.setUserId(ownerId);
        signature.setPersonId(personId);
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
