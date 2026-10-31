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
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.Landlord;
import fr.hkof.homeofficeexpenses.repository.LandlordRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.web.dto.LandlordDtos.LandlordDto;
import fr.hkof.homeofficeexpenses.web.dto.LandlordDtos.LandlordRequest;

class LandlordServiceTest {

    private static final Long USER_ID = 42L;

    private LandlordRepository landlords;
    private LeaseRepository leases;
    private SignatureRepository signatures;
    private OwnershipContext ownership;
    private LandlordService service;

    @BeforeEach
    void setUp() {
        landlords = mock(LandlordRepository.class);
        leases = mock(LeaseRepository.class);
        signatures = mock(SignatureRepository.class);
        ownership = mock(OwnershipContext.class);
        when(ownership.currentUserId()).thenReturn(USER_ID);
        service = new LandlordService(landlords, leases, signatures, ownership,
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private Landlord landlord(Long id, String name) {
        Landlord landlord = new Landlord();
        landlord.setId(id);
        landlord.setUserId(USER_ID);
        landlord.setName(name);
        landlord.setAddress("Adresse");
        return landlord;
    }

    @Test
    @DisplayName("Landlords are listed with their signature count")
    void lists() {
        when(landlords.findAllByUserId(USER_ID)).thenReturn(List.of(landlord(1L, "Alice")));
        when(signatures.countByPersonIdAndDeletedFalse(1L)).thenReturn(3L);

        List<LandlordDto> result = service.list();

        assertThat(result).extracting(LandlordDto::name).containsExactly("Alice");
        assertThat(result.get(0).signatureCount()).isEqualTo(3);
    }

    @Test
    @DisplayName("Landlords can be created, updated and logically deleted")
    void crud() {
        when(landlords.save(any(Landlord.class))).thenAnswer(invocation -> {
            Landlord saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        LandlordDto created = service.create(new LandlordRequest("  Alice ", "  ", " 06 12 34 56 78 ",
                "  Bâtiment B ", "  Lyon  "));
        assertThat(created.name()).isEqualTo("Alice");
        assertThat(created.address()).isNull();
        assertThat(created.phone()).isEqualTo("06 12 34 56 78");
        assertThat(created.addressNote()).isEqualTo("Bâtiment B");
        assertThat(created.issuePlace()).isEqualTo("Lyon");

        Landlord existing = landlord(1L, "Alice");
        when(landlords.findByIdAndUserIdAndDeletedFalse(1L, USER_ID)).thenReturn(Optional.of(existing));
        LandlordDto updated = service.update(1L, new LandlordRequest("Alicia", "2 rue", null, null, "   "));
        assertThat(updated.name()).isEqualTo("Alicia");
        assertThat(updated.address()).isEqualTo("2 rue");
        assertThat(updated.issuePlace()).isNull();

        service.delete(1L);
        assertThat(existing.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("An omitted phone or address note keeps the stored value, an explicit blank clears it")
    void preservesOmittedProfileFieldsOnUpdate() {
        Landlord existing = landlord(1L, "Alice");
        existing.setPhone("06 12 34 56 78");
        existing.setAddressNote("Bâtiment B");
        when(landlords.findByIdAndUserIdAndDeletedFalse(1L, USER_ID)).thenReturn(Optional.of(existing));
        when(landlords.save(any(Landlord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LandlordDto kept = service.update(1L, new LandlordRequest("Alice", null, null, null, null));
        assertThat(kept.phone()).isEqualTo("06 12 34 56 78");
        assertThat(kept.addressNote()).isEqualTo("Bâtiment B");

        LandlordDto cleared = service.update(1L, new LandlordRequest("Alice", null, "", "   ", null));
        assertThat(cleared.phone()).isNull();
        assertThat(cleared.addressNote()).isNull();
    }

    @Test
    @DisplayName("A landlord with signatures or an active lease cannot be deleted")
    void deletionGuards() {
        when(landlords.findByIdAndUserIdAndDeletedFalse(1L, USER_ID)).thenReturn(Optional.of(landlord(1L, "Alice")));
        when(signatures.existsByPersonIdAndDeletedFalse(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ce bailleur porte des signatures et ne peut pas être supprimé.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LANDLORD_HAS_SIGNATURES"));
        verify(landlords, never()).save(any(Landlord.class));

        when(signatures.existsByPersonIdAndDeletedFalse(1L)).thenReturn(false);
        when(leases.existsByLandlordIdAndDeletedFalse(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ce bailleur est utilisé par un bail actif et ne peut pas être supprimé.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LANDLORD_IN_USE"));
    }

    @Test
    @DisplayName("Blank names and unknown landlords are rejected in French")
    void validation() {
        assertThatThrownBy(() -> service.create(new LandlordRequest(null, null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom du bailleur est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("LANDLORD_NAME_REQUIRED"));

        when(landlords.findByIdAndUserIdAndDeletedFalse(9L, USER_ID)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update(9L, new LandlordRequest("x", null, null, null, null)))
                .isInstanceOf(NotFoundException.class).hasMessage("Bailleur introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("LANDLORD_NOT_FOUND"));
    }
}
