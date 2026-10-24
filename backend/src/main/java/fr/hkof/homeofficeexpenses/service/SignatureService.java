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
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.SignatureType;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.web.dto.SignatureDtos.SignatureDto;

/**
 * Signature versions: a landlord signature is attached to a landlord, an employee signature
 * to one employee of a company. Images are never overwritten, only logically deleted.
 */
@Service
public class SignatureService {

    /** Matches the {@code signature.name} column length. */
    public static final int MAX_NAME_LENGTH = 255;

    private final SignatureRepository repository;
    private final SignatureOwnerService owners;
    private final FileTypeDetector detector;
    private final Clock clock;

    public SignatureService(SignatureRepository repository, SignatureOwnerService owners,
            FileTypeDetector detector, Clock clock) {
        this.repository = repository;
        this.owners = owners;
        this.detector = detector;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<SignatureDto> list(Long companyId, Long employeeId) {
        List<Signature> signatures;
        if (employeeId != null) {
            Employee employee = owners.employee(employeeId);
            if (companyId != null && !companyId.equals(employee.getCompanyId())) {
                throw new BusinessException("Le salarié n'appartient pas à cette société.");
            }
            signatures = repository.findByCompanyIdAndEmployeeIdAndDeletedFalseOrderByNameAscIdAsc(
                    employee.getCompanyId(), employeeId);
        } else if (companyId != null) {
            owners.requireCompany(companyId);
            signatures = repository.findVisibleForCompany(companyId, SignatureType.LANDLORD);
        } else {
            signatures = repository.findByDeletedFalseOrderByTypeAscNameAscIdAsc();
        }
        return signatures.stream().map(this::toDto).toList();
    }

    @Transactional
    public SignatureDto create(SignatureType type, Long landlordId, Long employeeId, String name,
            MultipartFile file) {
        if (type == null) {
            throw new BusinessException("Le type de signature est obligatoire.");
        }
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
        signature.setType(type);
        owners.applyOwner(signature, type, landlordId, employeeId);
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
     * Resolves the LANDLORD signature for a selected landlord: the explicit signature when
     * given (it must belong to that landlord or be a legacy unlinked one), otherwise the first
     * signature linked to the landlord, then the first legacy unlinked LANDLORD signature.
     */
    @Transactional(readOnly = true)
    public Optional<Signature> resolveForLandlord(Long requestedId, Long landlordId) {
        if (landlordId == null) {
            throw new BusinessException("Le bailleur de la signature est obligatoire.");
        }
        if (requestedId != null) {
            Signature requested = entity(requestedId);
            if (requested.getType() != SignatureType.LANDLORD) {
                throw new BusinessException("La signature sélectionnée n'est pas une signature de bailleur.");
            }
            if (requested.getLandlordId() != null && !requested.getLandlordId().equals(landlordId)) {
                throw new BusinessException("La signature sélectionnée n'appartient pas à ce bailleur.");
            }
            return Optional.of(requested);
        }
        Optional<Signature> linked = repository
                .findFirstByTypeAndDeletedFalseAndLandlordIdOrderByNameAscIdAsc(
                        SignatureType.LANDLORD, landlordId);
        if (linked.isPresent()) {
            return linked;
        }
        return repository.findFirstByTypeAndDeletedFalseAndLandlordIdIsNullOrderByNameAscIdAsc(
                SignatureType.LANDLORD);
    }

    /**
     * Resolves the signature of one employee, mirroring {@link #resolveForLandlord}.
     */
    @Transactional(readOnly = true)
    public Optional<Signature> resolveForEmployee(Long requestedId, Long employeeId) {
        Employee employee = owners.employee(employeeId);
        if (requestedId != null) {
            Signature requested = entity(requestedId);
            if (requested.getType() == SignatureType.LANDLORD) {
                throw new BusinessException("La signature sélectionnée n'est pas une signature de salarié.");
            }
            if (requested.getEmployeeId() != null && !requested.getEmployeeId().equals(employeeId)) {
                throw new BusinessException("La signature sélectionnée n'appartient pas à ce salarié.");
            }
            return Optional.of(requested);
        }
        return repository.findFirstByTypeAndDeletedFalseAndEmployeeIdOrderByNameAscIdAsc(
                SignatureType.EMPLOYEE, employee.getId());
    }

    /**
     * Resolves the default statement signature of a company: the requested signature when
     * given, otherwise the CEO's first non-deleted signature, then any employee signature.
     */
    @Transactional(readOnly = true)
    public Optional<Signature> resolveForCompany(Long companyId, Long requestedId) {
        owners.requireCompany(companyId);
        if (requestedId != null) {
            Signature requested = entity(requestedId);
            if (requested.getType() == SignatureType.LANDLORD) {
                throw new BusinessException("La signature sélectionnée n'est pas une signature de salarié.");
            }
            if (requested.getCompanyId() != null && !requested.getCompanyId().equals(companyId)) {
                throw new BusinessException("La signature sélectionnée n'appartient pas à cette société.");
            }
            return Optional.of(requested);
        }
        Optional<Employee> ceo = owners.ceo(companyId);
        if (ceo.isPresent()) {
            Optional<Signature> employeeSignature = repository
                    .findFirstByTypeAndDeletedFalseAndEmployeeIdOrderByNameAscIdAsc(
                            SignatureType.EMPLOYEE, ceo.get().getId());
            if (employeeSignature.isPresent()) {
                return employeeSignature;
            }
            Optional<Signature> legacySignature = repository
                    .findFirstByTypeAndDeletedFalseAndEmployeeIdOrderByNameAscIdAsc(
                            SignatureType.ENTREPRISE_CEO, ceo.get().getId());
            if (legacySignature.isPresent()) {
                return legacySignature;
            }
        }
        return repository.findFirstByCompanyIdAndEmployeeIdIsNotNullAndDeletedFalseOrderByIdAsc(companyId);
    }

    @Transactional(readOnly = true)
    public Signature entity(Long id) {
        return repository.findById(id)
                .filter(signature -> !signature.isDeleted())
                .orElseThrow(() -> new NotFoundException("Signature introuvable."));
    }

    public SignatureDto toDto(Signature signature) {
        return owners.toDto(signature);
    }

    public record SignatureImage(byte[] content, String mimeType, String fileName) {
    }
}
