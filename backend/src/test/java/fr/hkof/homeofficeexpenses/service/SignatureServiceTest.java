package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import fr.hkof.homeofficeexpenses.domain.Landlord;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.SignatureType;
import fr.hkof.homeofficeexpenses.repository.LandlordRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.web.dto.SignatureDtos.SignatureDto;

class SignatureServiceTest {

    private static final String SAMPLE_PNG =
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=";
    private static final byte[] PNG = Base64.getDecoder().decode(SAMPLE_PNG);
    private static final byte[] JPEG = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10};

    private SignatureRepository repository;
    private LandlordRepository landlords;
    private SignatureService service;

    @BeforeEach
    void setUp() {
        repository = mock(SignatureRepository.class);
        landlords = mock(LandlordRepository.class);
        service = new SignatureService(repository, landlords, new FileTypeDetector(), Clock.systemUTC());
    }

    private Landlord landlord(Long id, String name, boolean deleted) {
        Landlord landlord = new Landlord();
        landlord.setId(id);
        landlord.setName(name);
        landlord.setDeleted(deleted);
        return landlord;
    }

    private Signature signature(Long id, SignatureType type, Long landlordId, String name, boolean deleted) {
        Signature signature = new Signature();
        signature.setId(id);
        signature.setType(type);
        signature.setLandlordId(landlordId);
        signature.setName(name);
        signature.setMimeType("image/png");
        signature.setFileName("signature.png");
        signature.setImage(PNG);
        signature.setDeleted(deleted);
        signature.setCreatedAt(Instant.parse("2026-10-01T10:00:00Z"));
        return signature;
    }

    private MultipartFile file(String name, byte[] content) {
        return new MockMultipartFile("file", name, "application/octet-stream", content);
    }

    @Test
    @DisplayName("Creates a PNG signature linked to its landlord")
    void createsSignatureLinkedToLandlord() {
        when(landlords.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(landlord(1L, "M. Bailleur", false)));
        when(landlords.findById(1L)).thenReturn(Optional.of(landlord(1L, "M. Bailleur", false)));
        when(repository.save(any(Signature.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SignatureDto dto = service.create(SignatureType.LANDLORD, 1L, "  Bailleur  ", file("signature.png", PNG));

        assertThat(dto.type()).isEqualTo("LANDLORD");
        assertThat(dto.name()).isEqualTo("Bailleur");
        assertThat(dto.mimeType()).isEqualTo("image/png");
        assertThat(dto.createdAt()).isNotNull();
        assertThat(dto.landlordId()).isEqualTo(1L);
        assertThat(dto.landlordName()).isEqualTo("M. Bailleur");

        ArgumentCaptor<Signature> saved = ArgumentCaptor.forClass(Signature.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getLandlordId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Requires an existing non deleted landlord for a LANDLORD signature")
    void requiresLandlordForLandlordSignature() {
        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, null, "Bailleur",
                file("signature.png", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le bailleur de la signature est obligatoire.");

        when(landlords.findByIdAndDeletedFalse(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, 99L, "Bailleur",
                file("signature.png", PNG)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Bailleur introuvable.");

        verify(repository, never()).save(any(Signature.class));
    }

    @Test
    @DisplayName("Rejects a landlord on an ENTREPRISE_CEO signature")
    void rejectsLandlordOnCeoSignature() {
        assertThatThrownBy(() -> service.create(SignatureType.ENTREPRISE_CEO, 1L, "Gérant",
                file("signature.jpg", JPEG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Une signature de gérant ne peut pas être liée à un bailleur.");
    }

    @Test
    @DisplayName("Accepts a JPEG signature through its magic bytes")
    void acceptsJpegMagicBytes() {
        when(repository.save(any(Signature.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SignatureDto dto = service.create(SignatureType.ENTREPRISE_CEO, null, "Gérant",
                file("signature.jpg", JPEG));

        assertThat(dto.mimeType()).isEqualTo("image/jpeg");
        assertThat(dto.landlordId()).isNull();
        assertThat(dto.landlordName()).isNull();
    }

    @Test
    @DisplayName("Rejects a file that is not a PNG or JPEG image")
    void rejectsNonImage() {
        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, null, "Bailleur",
                file("signature.gif", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature doit être une image PNG ou JPEG.");

        byte[] wrongMagic = new byte[]{'h', 'e', 'l', 'l', 'o'};
        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, null, "Bailleur",
                file("signature.png", wrongMagic)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature doit être une image PNG ou JPEG.");
    }

    @Test
    @DisplayName("Rejects an image larger than 2 MB")
    void rejectsOversizedImage() {
        byte[] oversized = new byte[(int) FileTypeDetector.MAX_SIGNATURE_SIZE + 1];
        System.arraycopy(PNG, 0, oversized, 0, PNG.length);

        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, null, "Bailleur",
                file("signature.png", oversized)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Image trop volumineuse (maximum 2 Mo).");
    }

    @Test
    @DisplayName("Requires a type, a name and a file")
    void requiresTypeNameAndFile() {
        assertThatThrownBy(() -> service.create(null, null, "Bailleur", file("signature.png", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le type de signature est obligatoire.");
        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, null, "  ",
                file("signature.png", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom de la signature est obligatoire.");
        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, null, "Bailleur",
                file("signature.png", new byte[0])))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le fichier de signature est obligatoire.");
    }

    @Test
    @DisplayName("Rejects a name longer than 255 characters instead of hitting the DB constraint")
    void rejectsOversizedName() {
        String tooLong = "a".repeat(256);

        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, null, tooLong,
                file("signature.png", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom de la signature est trop long (255 caractères maximum).");

        verify(repository, never()).save(any(Signature.class));

        when(landlords.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(landlord(1L, "M. Bailleur", false)));
        when(repository.save(any(Signature.class))).thenAnswer(invocation -> invocation.getArgument(0));
        assertThat(service.create(SignatureType.LANDLORD, 1L, "a".repeat(255),
                file("signature.png", PNG)).name()).hasSize(255);
    }

    @Test
    @DisplayName("Logical delete hides the signature and makes it unusable")
    void logicalDelete() {
        Signature stored = signature(4L, SignatureType.LANDLORD, 1L, "Bailleur", false);
        when(repository.findById(4L)).thenReturn(Optional.of(stored));

        service.delete(4L);

        assertThat(stored.isDeleted()).isTrue();
        verify(repository).save(stored);
        assertThatThrownBy(() -> service.dataUri(4L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("Builds a data URI from the stored bytes")
    void buildsDataUri() {
        when(repository.findById(5L))
                .thenReturn(Optional.of(signature(5L, SignatureType.LANDLORD, 1L, "Bailleur", false)));

        assertThat(service.dataUri(5L))
                .isEqualTo("data:image/png;base64," + Base64.getEncoder().encodeToString(PNG));
    }

    @Test
    @DisplayName("A missing or deleted signature is not readable")
    void missingSignatureIsNotReadable() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.dataUri(99L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Signature introuvable.");

        when(repository.findById(6L))
                .thenReturn(Optional.of(signature(6L, SignatureType.LANDLORD, 1L, "Bailleur", true)));
        assertThatThrownBy(() -> service.resolve(6L, SignatureType.LANDLORD))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("Resolves the requested signature, otherwise the first of the default type")
    void resolvesRequestedOrDefault() {
        Signature requested = signature(7L, SignatureType.ENTREPRISE_CEO, null, "Gérant", false);
        when(repository.findById(7L)).thenReturn(Optional.of(requested));
        assertThat(service.resolve(7L, SignatureType.LANDLORD)).contains(requested);

        Signature defaultLandlord = signature(8L, SignatureType.LANDLORD, 1L, "Bailleur", false);
        when(repository.findFirstByTypeAndDeletedFalseOrderByNameAscIdAsc(SignatureType.LANDLORD))
                .thenReturn(Optional.of(defaultLandlord));
        assertThat(service.resolve(null, SignatureType.LANDLORD)).contains(defaultLandlord);

        when(repository.findFirstByTypeAndDeletedFalseOrderByNameAscIdAsc(SignatureType.ENTREPRISE_CEO))
                .thenReturn(Optional.empty());
        assertThat(service.resolve(null, SignatureType.ENTREPRISE_CEO)).isEmpty();
    }

    @Test
    @DisplayName("Resolves a LANDLORD signature for the selected landlord")
    void resolvesSignatureForLandlord() {
        Signature linked = signature(10L, SignatureType.LANDLORD, 1L, "Bailleur 1", false);
        Signature legacy = signature(11L, SignatureType.LANDLORD, null, "Ancienne signature", false);
        Signature otherLandlord = signature(12L, SignatureType.LANDLORD, 2L, "Bailleur 2", false);

        when(repository.findById(10L)).thenReturn(Optional.of(linked));
        when(repository.findById(11L)).thenReturn(Optional.of(legacy));
        when(repository.findById(12L)).thenReturn(Optional.of(otherLandlord));
        when(repository.findById(13L))
                .thenReturn(Optional.of(signature(13L, SignatureType.ENTREPRISE_CEO, null, "Gérant", false)));

        assertThat(service.resolveForLandlord(10L, 1L)).contains(linked);
        // A legacy unlinked signature stays usable as a fallback.
        assertThat(service.resolveForLandlord(11L, 1L)).contains(legacy);

        assertThatThrownBy(() -> service.resolveForLandlord(12L, 1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature sélectionnée n'appartient pas à ce bailleur.");
        assertThatThrownBy(() -> service.resolveForLandlord(13L, 1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature sélectionnée n'est pas une signature de bailleur.");

        when(repository.findFirstByTypeAndDeletedFalseAndLandlordIdOrderByNameAscIdAsc(
                SignatureType.LANDLORD, 1L)).thenReturn(Optional.of(linked));
        assertThat(service.resolveForLandlord(null, 1L)).contains(linked);

        when(repository.findFirstByTypeAndDeletedFalseAndLandlordIdOrderByNameAscIdAsc(
                SignatureType.LANDLORD, 1L)).thenReturn(Optional.empty());
        when(repository.findFirstByTypeAndDeletedFalseAndLandlordIdIsNullOrderByNameAscIdAsc(
                SignatureType.LANDLORD)).thenReturn(Optional.of(legacy));
        assertThat(service.resolveForLandlord(null, 1L)).contains(legacy);

        when(repository.findFirstByTypeAndDeletedFalseAndLandlordIdIsNullOrderByNameAscIdAsc(
                SignatureType.LANDLORD)).thenReturn(Optional.empty());
        assertThat(service.resolveForLandlord(null, 1L)).isEmpty();
    }

    @Test
    @DisplayName("Lists only the non deleted signatures with their landlord")
    void listsSignatures() {
        Signature stored = signature(1L, SignatureType.LANDLORD, 1L, "Bailleur", false);
        when(repository.findByDeletedFalseOrderByTypeAscNameAscIdAsc()).thenReturn(List.of(stored));
        when(landlords.findById(1L)).thenReturn(Optional.of(landlord(1L, "M. Bailleur", false)));

        List<SignatureDto> signatures = service.list();

        assertThat(signatures).hasSize(1);
        assertThat(signatures.get(0).name()).isEqualTo("Bailleur");
        assertThat(signatures.get(0).landlordId()).isEqualTo(1L);
        assertThat(signatures.get(0).landlordName()).isEqualTo("M. Bailleur");
    }
}
