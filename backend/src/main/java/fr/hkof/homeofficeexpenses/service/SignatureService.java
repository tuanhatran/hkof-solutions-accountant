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

import fr.hkof.homeofficeexpenses.domain.Landlord;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.SignatureType;
import fr.hkof.homeofficeexpenses.repository.LandlordRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.web.dto.SignatureDtos.SignatureDto;

@Service
public class SignatureService {

    /** Matches the {@code signature.name} column length. */
    public static final int MAX_NAME_LENGTH = 255;

    private final SignatureRepository repository;
    private final LandlordRepository landlords;
    private final FileTypeDetector detector;
    private final Clock clock;

    public SignatureService(SignatureRepository repository, LandlordRepository landlords,
            FileTypeDetector detector, Clock clock) {
        this.repository = repository;
        this.landlords = landlords;
        this.detector = detector;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<SignatureDto> list() {
        return repository.findByDeletedFalseOrderByTypeAscNameAscIdAsc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public SignatureDto create(SignatureType type, Long landlordId, String name, MultipartFile file) {
        if (type == null) {
            throw new BusinessException("Le type de signature est obligatoire.");
        }
        if (name == null || name.isBlank()) {
            throw new BusinessException("Le nom de la signature est obligatoire.");
        }
        String trimmedName = name.trim();
        if (trimmedName.length() > SignatureService.MAX_NAME_LENGTH) {
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
        Landlord landlord = landlord(type, landlordId);
        Signature signature = new Signature();
        signature.setType(type);
        signature.setLandlordId(landlord == null ? null : landlord.getId());
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
     * Resolves the signature to use: the explicitly requested one when given (validated),
     * otherwise the first non-deleted signature of the default type.
     */
    @Transactional(readOnly = true)
    public Optional<Signature> resolve(Long requestedId, SignatureType defaultType) {
        if (requestedId != null) {
            return Optional.of(entity(requestedId));
        }
        if (defaultType == null) {
            return Optional.empty();
        }
        return repository.findFirstByTypeAndDeletedFalseOrderByNameAscIdAsc(defaultType);
    }

    @Transactional(readOnly = true)
    public Signature entity(Long id) {
        return repository.findById(id)
                .filter(signature -> !signature.isDeleted())
                .orElseThrow(() -> new NotFoundException("Signature introuvable."));
    }

    public SignatureDto toDto(Signature signature) {
        Landlord landlord = signature.getLandlordId() == null
                ? null
                : landlords.findById(signature.getLandlordId()).orElse(null);
        return new SignatureDto(
                signature.getId(),
                signature.getType().name(),
                signature.getName(),
                signature.getMimeType(),
                signature.getCreatedAt(),
                signature.getLandlordId(),
                landlord == null ? null : landlord.getName());
    }

    private Landlord landlord(SignatureType type, Long landlordId) {
        if (type == SignatureType.ENTREPRISE_CEO) {
            if (landlordId != null) {
                throw new BusinessException("Une signature de gérant ne peut pas être liée à un bailleur.");
            }
            return null;
        }
        if (landlordId == null) {
            throw new BusinessException("Le bailleur de la signature est obligatoire.");
        }
        return landlords.findByIdAndDeletedFalse(landlordId)
                .orElseThrow(() -> new NotFoundException("Bailleur introuvable."));
    }

    public record SignatureImage(byte[] content, String mimeType, String fileName) {
    }
}
