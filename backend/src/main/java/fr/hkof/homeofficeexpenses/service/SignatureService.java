package fr.hkof.homeofficeexpenses.service;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import fr.hkof.homeofficeexpenses.domain.Employee;
import fr.hkof.homeofficeexpenses.domain.EmployeeTitle;
import fr.hkof.homeofficeexpenses.domain.Person;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.PersonRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.web.dto.SignatureDtos.SignatureDto;

/**
 * Signature versions attached to one person. Several signatures may coexist for the same
 * person; images are never overwritten, only logically deleted.
 */
@Service
public class SignatureService {

    /** Matches the {@code signature.name} column length. */
    public static final int MAX_NAME_LENGTH = 255;

    private final SignatureRepository repository;
    private final PersonRepository persons;
    private final EmployeeRepository employees;
    private final FileTypeDetector detector;
    private final Clock clock;

    public SignatureService(SignatureRepository repository, PersonRepository persons, EmployeeRepository employees,
            FileTypeDetector detector, Clock clock) {
        this.repository = repository;
        this.persons = persons;
        this.employees = employees;
        this.detector = detector;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<SignatureDto> list(Long personId) {
        requirePerson(personId);
        return repository.findByPersonIdAndDeletedFalseOrderByNameAscIdAsc(personId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public SignatureDto create(Long personId, String name, MultipartFile file) {
        Person person = requirePerson(personId);
        if (name == null || name.isBlank()) {
            throw new BusinessException("Le nom de la signature est obligatoire.");
        }
        String trimmedName = name.trim();
        if (trimmedName.length() > MAX_NAME_LENGTH) {
            throw new BusinessException(
                    "Le nom de la signature est trop long (255 caractères maximum).");
        }
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Le fichier de signature est obligatoire.");
        }
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException ex) {
            throw new BusinessException("Impossible de lire le fichier de signature.");
        }
        FileTypeDetector.DetectedFile detected = detector.detectSignature(file.getOriginalFilename(), content);
        Signature signature = new Signature();
        signature.setPersonId(person.getId());
        signature.setName(trimmedName);
        signature.setMimeType(detected.mimeType());
        signature.setFileName(file.getOriginalFilename());
        signature.setImage(content);
        signature.setDeleted(false);
        signature.setCreatedAt(Instant.now(clock));
        return toDto(repository.save(signature));
    }

    @Transactional
    public void delete(Long id) {
        Signature signature = entity(id);
        signature.setDeleted(true);
        signature.setUpdatedAt(Instant.now(clock));
        repository.save(signature);
    }

    @Transactional(readOnly = true)
    public SignatureImage image(Long id) {
        Signature signature = entity(id);
        String fileName = signature.getFileName() == null || signature.getFileName().isBlank()
                ? "signature"
                : signature.getFileName();
        return new SignatureImage(signature.getImage(), signature.getMimeType(), fileName);
    }

    /**
     * Returns the image as a {@code data:} URI, ready to be injected into a template.
     */
    @Transactional(readOnly = true)
    public String dataUri(Long id) {
        Signature signature = entity(id);
        return "data:" + signature.getMimeType() + ";base64,"
                + Base64.getEncoder().encodeToString(signature.getImage());
    }

    /**
     * Resolves the signature of one person: the explicit signature when given (it must belong
     * to that person), otherwise the first non-deleted signature of that person. No fallback.
     */
    @Transactional(readOnly = true)
    public Optional<Signature> resolveForPerson(Long requestedId, Long personId) {
        requirePerson(personId);
        if (requestedId != null) {
            Signature requested = entity(requestedId);
            if (!personId.equals(requested.getPersonId())) {
                throw new BusinessException("La signature sélectionnée n'appartient pas à cette personne.");
            }
            return Optional.of(requested);
        }
        return repository.findFirstByPersonIdAndDeletedFalseOrderByNameAscIdAsc(personId);
    }

    /**
     * Resolves the statement signature: only the active company's CEO employee is eligible.
     * Returns empty when the company has no CEO or the CEO has no signature.
     */
    @Transactional(readOnly = true)
    public Optional<Signature> resolveForCompanyCeo(Long companyId, Long requestedId) {
        if (companyId == null) {
            throw new BusinessException("La société de la signature est obligatoire.");
        }
        Optional<Employee> ceo = employees
                .findFirstByCompanyIdAndTitleAndDeletedFalseOrderByIdAsc(companyId, EmployeeTitle.CEO);
        if (ceo.isEmpty()) {
            return Optional.empty();
        }
        Long ceoId = ceo.get().getId();
        if (requestedId != null) {
            Signature requested = entity(requestedId);
            if (!ceoId.equals(requested.getPersonId())) {
                throw new BusinessException(
                        "La signature sélectionnée n'appartient pas au gérant de cette société.");
            }
            return Optional.of(requested);
        }
        return repository.findFirstByPersonIdAndDeletedFalseOrderByNameAscIdAsc(ceoId);
    }

    @Transactional(readOnly = true)
    public Signature entity(Long id) {
        return repository.findById(id)
                .filter(signature -> !signature.isDeleted())
                .orElseThrow(() -> new NotFoundException("Signature introuvable."));
    }

    public SignatureDto toDto(Signature signature) {
        Person person = signature.getPersonId() == null ? null
                : persons.findById(signature.getPersonId()).orElse(null);
        return new SignatureDto(
                signature.getId(),
                signature.getPersonId(),
                personName(person),
                signature.getName(),
                signature.getMimeType(),
                signature.getCreatedAt());
    }

    private Person requirePerson(Long personId) {
        if (personId == null) {
            throw new BusinessException("La personne de la signature est obligatoire.");
        }
        return persons.findByIdAndDeletedFalse(personId)
                .orElseThrow(() -> new NotFoundException("Personne introuvable."));
    }

    private String personName(Person person) {
        if (person == null) {
            return null;
        }
        if (person.getName() != null && !person.getName().isBlank()) {
            return person.getName();
        }
        if (person instanceof Employee employee) {
            String first = employee.getFirstName() == null ? "" : employee.getFirstName();
            String last = employee.getLastName() == null ? "" : employee.getLastName();
            String full = (first + " " + last).trim();
            return full.isEmpty() ? null : full;
        }
        return null;
    }

    public record SignatureImage(byte[] content, String mimeType, String fileName) {
    }
}
