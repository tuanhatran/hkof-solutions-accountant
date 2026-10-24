package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Company;
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
 * Company directory. A company owns its identity, home-office data, expense items and
 * expense statements; logical deletion keeps its history reachable.
 */
@Service
public class CompanyService {

    private final CompanyRepository repository;
    private final ExpenseItemRepository expenseItems;
    private final ExpenseStatementRepository statements;
    private final EmployeeRepository employees;
    private final LeaseRepository leases;
    private final SignatureRepository signatures;
    private final RentReceiptRepository rentReceipts;
    private final Clock clock;

    public CompanyService(CompanyRepository repository, ExpenseItemRepository expenseItems,
            ExpenseStatementRepository statements, EmployeeRepository employees, LeaseRepository leases,
            SignatureRepository signatures, RentReceiptRepository rentReceipts, Clock clock) {
        this.repository = repository;
        this.expenseItems = expenseItems;
        this.statements = statements;
        this.employees = employees;
        this.leases = leases;
        this.signatures = signatures;
        this.rentReceipts = rentReceipts;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<CompanyDto> list() {
        return repository.findAllByDeletedFalseOrderByNameAscIdAsc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public CompanyDto get(Long id) {
        return toDto(entity(id));
    }

    @Transactional
    public CompanyDto create(CompanyRequest request) {
        Company company = new Company();
        apply(company, request, null);
        company.setDeleted(false);
        company.setCreatedAt(Instant.now(clock));
        company.setUpdatedAt(Instant.now(clock));
        return toDto(repository.save(company));
    }

    @Transactional
    public CompanyDto update(Long id, CompanyRequest request) {
        Company company = entity(id);
        apply(company, request, id);
        company.setUpdatedAt(Instant.now(clock));
        return toDto(repository.save(company));
    }

    @Transactional
    public void delete(Long id) {
        Company company = entity(id);
        if (expenseItems.existsByCompanyIdAndDeletedFalse(id)
                || statements.existsByCompanyId(id)
                || employees.existsByCompanyIdAndDeletedFalse(id)
                || leases.existsByCompanyIdAndDeletedFalse(id)
                || signatures.existsByCompanyIdAndDeletedFalse(id)
                || rentReceipts.existsByCompanyId(id)) {
            throw new BusinessException(
                    "Cette société est utilisée par des données et ne peut pas être supprimée.");
        }
        company.setDeleted(true);
        company.setUpdatedAt(Instant.now(clock));
        repository.save(company);
    }

    @Transactional(readOnly = true)
    public java.util.Optional<Company> find(Long id) {
        return repository.findById(id);
    }

    @Transactional(readOnly = true)
    public Company entity(Long id) {
        if (id == null) {
            throw new BusinessException("Sélectionnez une société.");
        }
        return repository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Société introuvable."));
    }

    public CompanyDto toDto(Company company) {
        BigDecimal proRataBase = CalculationService.proRataBase(company.getBusinessArea(), company.getTotalArea());
        return new CompanyDto(
                company.getId(),
                company.getName(),
                company.getLegalForm(),
                company.getSiren(),
                company.getAddress(),
                company.getManagerName(),
                company.getHomeAddress(),
                Amounts.apiValue(company.getTotalArea()),
                Amounts.apiValue(company.getBusinessArea()),
                Amounts.apiValue(proRataBase),
                proRataDetail(company, proRataBase),
                company.getIssuePlace());
    }

    public String proRataDetail(Company company, BigDecimal proRataBase) {
        if (company.getBusinessArea() == null || company.getTotalArea() == null) {
            return "Surfaces non configurées";
        }
        return "Surface pro %s m² / %s m² = %s".formatted(
                Amounts.apiValue(company.getBusinessArea()).replace(".", ","),
                Amounts.apiValue(company.getTotalArea()).replace(".", ","),
                Amounts.formatPercentage(proRataBase));
    }

    private void apply(Company company, CompanyRequest request, Long currentId) {
        company.setName(requiredText(request.name(), "Le nom de la société est obligatoire."));
        company.setLegalForm(optionalText(request.legalForm()));
        String siren = optionalText(request.siren());
        if (siren != null) {
            boolean duplicate = currentId == null
                    ? repository.existsBySirenAndDeletedFalse(siren)
                    : repository.existsBySirenAndDeletedFalseAndIdNot(siren, currentId);
            if (duplicate) {
                throw new BusinessException("Une société avec ce SIREN existe déjà.");
            }
        }
        company.setSiren(siren);
        company.setAddress(optionalText(request.address()));
        company.setManagerName(optionalText(request.managerName()));
        company.setHomeAddress(optionalText(request.homeAddress()));
        company.setTotalArea(Amounts.optionalDecimal(request.totalArea(), "surface totale"));
        company.setBusinessArea(Amounts.optionalDecimal(request.businessArea(), "surface professionnelle"));
        if (company.getTotalArea() != null && company.getBusinessArea() != null) {
            CalculationService.proRataBase(company.getBusinessArea(), company.getTotalArea());
        }
        company.setIssuePlace(optionalText(request.issuePlace()));
    }

    private String requiredText(String value, String message) {
        String cleaned = value == null ? "" : value.trim();
        if (cleaned.isEmpty()) {
            throw new BusinessException(message);
        }
        return cleaned;
    }

    private String optionalText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
