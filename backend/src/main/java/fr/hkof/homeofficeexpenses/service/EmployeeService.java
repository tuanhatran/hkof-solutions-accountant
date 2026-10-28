package fr.hkof.homeofficeexpenses.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Employee;
import fr.hkof.homeofficeexpenses.domain.EmployeeTitle;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.web.dto.EmployeeDtos.EmployeeDto;
import fr.hkof.homeofficeexpenses.web.dto.EmployeeDtos.EmployeeRequest;

/**
 * Employees belong to exactly one company and carry a descriptive title. The title grants
 * no right until the deferred RBAC task is implemented.
 */
@Service
public class EmployeeService {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final EmployeeRepository repository;
    private final SignatureRepository signatures;
    private final CompanyService companies;
    private final Clock clock;

    public EmployeeService(EmployeeRepository repository, SignatureRepository signatures, CompanyService companies,
            Clock clock) {
        this.repository = repository;
        this.signatures = signatures;
        this.companies = companies;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<EmployeeDto> list(Long companyId) {
        companies.entity(companyId);
        return repository.findAllByCompanyIdAndDeletedFalseOrderByLastNameAscFirstNameAscIdAsc(companyId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public EmployeeDto create(Long companyId, EmployeeRequest request) {
        companies.entity(companyId);
        Employee employee = new Employee();
        employee.setCompanyId(companyId);
        apply(employee, request, companyId, null);
        employee.setDeleted(false);
        employee.setCreatedAt(Instant.now(clock));
        employee.setUpdatedAt(Instant.now(clock));
        return toDto(repository.save(employee));
    }

    @Transactional
    public EmployeeDto update(Long id, EmployeeRequest request) {
        Employee employee = entity(id);
        Long targetCompanyId = request.companyId() == null ? employee.getCompanyId() : request.companyId();
        if (!targetCompanyId.equals(employee.getCompanyId())) {
            companies.entity(targetCompanyId);
        }
        employee.setCompanyId(targetCompanyId);
        apply(employee, request, targetCompanyId, id);
        employee.setUpdatedAt(Instant.now(clock));
        return toDto(repository.save(employee));
    }

    @Transactional
    public void delete(Long id) {
        Employee employee = entity(id);
        if (signatures.existsByPersonIdAndDeletedFalse(id)) {
            throw new BusinessException("EMPLOYEE_HAS_SIGNATURES",
                    "Ce salarié porte des signatures et ne peut pas être supprimé.");
        }
        employee.setDeleted(true);
        employee.setUpdatedAt(Instant.now(clock));
        repository.save(employee);
    }

    @Transactional(readOnly = true)
    public Employee entity(Long id) {
        return repository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("EMPLOYEE_NOT_FOUND", "Salarié introuvable."));
    }

    /**
     * First non-blank issue place of a CEO employee of the company, in the same directory
     * order as the employee list. Used as the note de frais issue place before the company
     * fallback.
     */
    @Transactional(readOnly = true)
    public Optional<String> ceoIssuePlace(Long companyId) {
        if (companyId == null) {
            return Optional.empty();
        }
        return repository.findAllByCompanyIdAndDeletedFalseOrderByLastNameAscFirstNameAscIdAsc(companyId).stream()
                .filter(employee -> employee.getTitle() == EmployeeTitle.CEO)
                .map(Employee::getIssuePlace)
                .filter(place -> place != null && !place.isBlank())
                .findFirst()
                .map(String::trim);
    }

    public EmployeeDto toDto(Employee employee) {
        long signatureCount = employee.getId() == null ? 0
                : signatures.countByPersonIdAndDeletedFalse(employee.getId());
        return new EmployeeDto(
                employee.getId(),
                employee.getCompanyId(),
                employee.getFirstName(),
                employee.getLastName(),
                employee.getEmail(),
                employee.getAddress(),
                (int) signatureCount,
                employee.getTitle().name(),
                employee.getIssuePlace());
    }

    private void apply(Employee employee, EmployeeRequest request, Long companyId, Long currentId) {
        employee.setFirstName(requiredText(request.firstName(), "EMPLOYEE_FIRST_NAME_REQUIRED",
                "Le prénom du salarié est obligatoire."));
        employee.setLastName(requiredText(request.lastName(), "EMPLOYEE_LAST_NAME_REQUIRED",
                "Le nom du salarié est obligatoire."));
        String email = optionalText(request.email());
        if (email != null) {
            if (!EMAIL.matcher(email).matches()) {
                throw new BusinessException("EMPLOYEE_EMAIL_INVALID",
                        "L'adresse électronique du salarié est invalide.");
            }
            boolean duplicate = currentId == null
                    ? repository.existsByCompanyIdAndEmailIgnoreCaseAndDeletedFalse(companyId, email)
                    : repository.existsByCompanyIdAndEmailIgnoreCaseAndDeletedFalseAndIdNot(companyId, email,
                            currentId);
            if (duplicate) {
                throw new BusinessException("EMPLOYEE_EMAIL_DUPLICATE",
                        "Un salarié avec cette adresse électronique existe déjà dans la société.");
            }
        }
        employee.setEmail(email);
        employee.setAddress(optionalText(request.address()));
        employee.setIssuePlace(optionalText(request.issuePlace()));
        employee.setTitle(title(request.title()));
    }

    private EmployeeTitle title(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException("EMPLOYEE_TITLE_REQUIRED", "L'intitulé du salarié est obligatoire.");
        }
        try {
            return EmployeeTitle.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("EMPLOYEE_TITLE_INVALID", "Intitulé de salarié invalide : " + value,
                    Map.of("title", value));
        }
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
