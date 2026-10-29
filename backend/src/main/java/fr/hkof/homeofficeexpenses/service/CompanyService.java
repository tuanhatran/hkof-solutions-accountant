package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Employee;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.repository.CompanyRepository;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseStatementRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.RentReceiptRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.web.dto.CompanyDtos.CompanyDto;
import fr.hkof.homeofficeexpenses.web.dto.CompanyDtos.CompanyRequest;

/**
 * Company directory. A company owns its identity, its employees, its expense items and
 * expense statements. It may own several leases; one of them is its active lease, which
 * supplies the dwelling surfaces used by the pro-rata. Logical deletion keeps its history
 * reachable.
 */
@Service
public class CompanyService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(Amounts.SCALE, RoundingMode.HALF_UP);

    private final CompanyRepository repository;
    private final ExpenseItemRepository expenseItems;
    private final ExpenseStatementRepository statements;
    private final EmployeeRepository employees;
    private final LeaseRepository leases;
    private final SignatureRepository signatures;
    private final RentReceiptRepository rentReceipts;
    private final OwnershipContext ownership;
    private final Clock clock;

    public CompanyService(CompanyRepository repository, ExpenseItemRepository expenseItems,
            ExpenseStatementRepository statements, EmployeeRepository employees, LeaseRepository leases,
            SignatureRepository signatures, RentReceiptRepository rentReceipts, OwnershipContext ownership,
            Clock clock) {
        this.repository = repository;
        this.expenseItems = expenseItems;
        this.statements = statements;
        this.employees = employees;
        this.leases = leases;
        this.signatures = signatures;
        this.rentReceipts = rentReceipts;
        this.ownership = ownership;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<CompanyDto> list() {
        return repository.findAllByUserIdAndDeletedFalseOrderByNameAscIdAsc(ownership.currentUserId()).stream()
                .map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public CompanyDto get(Long id) {
        return toDto(entity(id));
    }

    @Transactional
    public CompanyDto create(CompanyRequest request) {
        Company company = new Company();
        apply(company, request, null);
        company.setUserId(ownership.currentUserId());
        company.setDeleted(false);
        company.setCreatedAt(Instant.now(clock));
        company.setUpdatedAt(Instant.now(clock));
        Company saved = repository.save(company);
        linkLease(saved, request.leaseId());
        return toDto(saved);
    }

    @Transactional
    public CompanyDto update(Long id, CompanyRequest request) {
        Company company = entity(id);
        apply(company, request, id);
        company.setUpdatedAt(Instant.now(clock));
        Company saved = repository.save(company);
        linkLease(saved, request.leaseId());
        return toDto(saved);
    }

    /**
     * Selects the company's active lease. The target must belong to this company or to nobody:
     * a lease already linked to another company is rejected in French, and an unowned lease is
     * acquired. Switching between two leases of the same company only moves the active pointer;
     * no lease is released, so a company lease always keeps its tenant company.
     */
    @Transactional
    public void linkLease(Company company, Long leaseId) {
        Optional<Lease> current = linkedLease(company);
        if (leaseId == null) {
            current.ifPresent(this::releaseLease);
            setActiveLease(company, null);
            return;
        }
        if (current.filter(lease -> lease.getId().equals(leaseId)).isPresent()) {
            setActiveLease(company, leaseId);
            return;
        }
        Lease target = leases.findByIdAndUserIdAndDeletedFalse(leaseId, ownership.currentUserId())
                .orElseThrow(() -> new NotFoundException("LEASE_NOT_FOUND", "Bail introuvable."));
        if (target.getCompanyId() != null && !target.getCompanyId().equals(company.getId())) {
            throw new BusinessException("LEASE_ALREADY_LINKED", "Ce bail est déjà lié à une autre société.");
        }
        if (target.getCompanyId() == null) {
            current.ifPresent(this::releaseLease);
            target.setCompanyId(company.getId());
            leases.save(target);
        }
        setActiveLease(company, leaseId);
    }

    /**
     * A company lease keeps its tenant company and can never be released from the company form;
     * a normal lease only carries the optional pro-rata link and is unlinked.
     */
    private void releaseLease(Lease lease) {
        if (lease.isCompanyLease()) {
            throw new BusinessException("LEASE_COMPANY_LEASE_LOCKED",
                    "Ce bail est un bail société : la société en est le locataire et ne peut pas être dissociée.");
        }
        unlink(lease);
    }

    @Transactional
    public void delete(Long id) {
        Company company = entity(id);
        if (expenseItems.existsByCompanyIdAndDeletedFalse(id)
                || statements.existsByCompanyId(id)
                || rentReceipts.existsByCompanyId(id)) {
            throw new BusinessException("COMPANY_IN_USE",
                    "Cette société est utilisée par des données et ne peut pas être supprimée.");
        }
        if (leases.existsByUserIdAndCompanyIdAndCompanyLeaseTrueAndDeletedFalse(ownership.currentUserId(), id)) {
            throw new BusinessException("COMPANY_ACTIVE_LEASE_TENANT",
                    "Cette société est locataire d'un bail actif et ne peut pas être supprimée.");
        }
        Instant now = Instant.now(clock);
        Long owner = ownership.currentUserId();
        List<Employee> companyEmployees = employees
                .findAllByUserIdAndCompanyIdAndDeletedFalseOrderByLastNameAscFirstNameAscIdAsc(owner, id);
        for (Employee employee : companyEmployees) {
            employee.setDeleted(true);
            employee.setUpdatedAt(now);
        }
        if (!companyEmployees.isEmpty()) {
            employees.saveAll(companyEmployees);
        }
        List<Long> employeeIds = companyEmployees.stream().map(Employee::getId).toList();
        List<Signature> companySignatures = employeeIds.isEmpty() ? List.of()
                : signatures.findAllByUserIdAndPersonIdInAndDeletedFalse(owner, employeeIds);
        for (Signature signature : companySignatures) {
            signature.setDeleted(true);
            signature.setUpdatedAt(now);
        }
        if (!companySignatures.isEmpty()) {
            signatures.saveAll(companySignatures);
        }
        for (Lease lease : leases.findAllByUserIdAndCompanyIdAndDeletedFalse(owner, id)) {
            unlink(lease);
        }
        company.setActiveLeaseId(null);
        company.setDeleted(true);
        company.setUpdatedAt(now);
        repository.save(company);
    }

    @Transactional(readOnly = true)
    public Optional<Company> find(Long id) {
        return repository.findByIdAndUserId(id, ownership.currentUserId());
    }

    @Transactional(readOnly = true)
    public Company entity(Long id) {
        if (id == null) {
            throw new BusinessException("COMPANY_REQUIRED", "Sélectionnez une société.");
        }
        return repository.findByIdAndUserIdAndDeletedFalse(id, ownership.currentUserId())
                .orElseThrow(() -> new NotFoundException("COMPANY_NOT_FOUND", "Société introuvable."));
    }

    /** Pro-rata base computed from the linked lease surfaces, zero without lease or surfaces. */
    public BigDecimal proRataBase(Company company) {
        return linkedLease(company)
                .map(lease -> CalculationService.proRataBase(lease.getBusinessArea(), lease.getTotalArea()))
                .orElse(ZERO);
    }

    public String proRataDetail(Company company) {
        return proRataDetail(company, proRataBase(company));
    }

    public String proRataDetail(Company company, BigDecimal proRataBase) {
        return linkedLease(company)
                .map(lease -> Amounts.proRataDetail(lease.getBusinessArea(), lease.getTotalArea(), proRataBase))
                .orElse("Surfaces non configurées");
    }

    public CompanyDto toDto(Company company) {
        Optional<Lease> lease = linkedLease(company);
        BigDecimal proRataBase = lease
                .map(linked -> CalculationService.proRataBase(linked.getBusinessArea(), linked.getTotalArea()))
                .orElse(ZERO);
        return new CompanyDto(
                company.getId(),
                company.getName(),
                company.getLegalForm(),
                company.getSiren(),
                company.getAddress(),
                company.getManagerName(),
                lease.map(Lease::getId).orElse(null),
                Amounts.apiValue(proRataBase),
                lease.isEmpty() || lease.get().getTotalArea() == null
                        ? "Surfaces non configurées"
                        : proRataDetail(company, proRataBase),
                company.getIssuePlace());
    }

    private Optional<Lease> linkedLease(Company company) {
        if (company.getId() == null) {
            return Optional.empty();
        }
        Long owner = ownership.currentUserId();
        Optional<Lease> active = company.getActiveLeaseId() == null
                ? Optional.empty()
                : leases.findByIdAndUserIdAndDeletedFalse(company.getActiveLeaseId(), owner)
                        .filter(lease -> company.getId().equals(lease.getCompanyId()));
        return active.or(() -> leases.findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(owner,
                company.getId()));
    }

    private void setActiveLease(Company company, Long leaseId) {
        company.setActiveLeaseId(leaseId);
        repository.save(company);
    }

    private void unlink(Lease lease) {
        lease.setCompanyId(null);
        leases.save(lease);
    }

    private void apply(Company company, CompanyRequest request, Long currentId) {
        company.setName(requiredText(request.name(), "COMPANY_NAME_REQUIRED",
                "Le nom de la société est obligatoire."));
        company.setLegalForm(optionalText(request.legalForm()));
        String siren = optionalText(request.siren());
        if (siren != null) {
            Long owner = ownership.currentUserId();
            boolean duplicate = currentId == null
                    ? repository.existsByUserIdAndSirenAndDeletedFalse(owner, siren)
                    : repository.existsByUserIdAndSirenAndDeletedFalseAndIdNot(owner, siren, currentId);
            if (duplicate) {
                throw new BusinessException("COMPANY_SIREN_DUPLICATE", "Une société avec ce SIREN existe déjà.");
            }
        }
        company.setSiren(siren);
        company.setAddress(optionalText(request.address()));
        company.setManagerName(optionalText(request.managerName()));
        company.setIssuePlace(optionalText(request.issuePlace()));
    }

    private String requiredText(String value, String code, String message) {
        String cleaned = value == null ? "" : value.trim();
        if (cleaned.isEmpty()) {
            throw new BusinessException(code, message);
        }
        return cleaned;
    }

    private String optionalText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
