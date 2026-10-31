package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.Agency;
import fr.hkof.homeofficeexpenses.repository.AgencyRepository;
import fr.hkof.homeofficeexpenses.web.dto.AgencyDtos.AgencyDto;
import fr.hkof.homeofficeexpenses.web.dto.AgencyDtos.AgencyRequest;

class AgencyServiceTest {

    private static final Long USER_ID = 42L;

    private AgencyRepository agencies;
    private OwnershipContext ownership;
    private AgencyService service;

    @BeforeEach
    void setUp() {
        agencies = mock(AgencyRepository.class);
        ownership = mock(OwnershipContext.class);
        when(ownership.currentUserId()).thenReturn(USER_ID);
        service = new AgencyService(agencies, ownership,
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    @DisplayName("get() returns empty when no agency exists for the current user")
    void getEmpty() {
        when(agencies.findByUserId(USER_ID)).thenReturn(Optional.empty());

        assertThat(service.get()).isEmpty();
    }

    @Test
    @DisplayName("get() returns DTO when agency exists")
    void getExisting() {
        Agency agency = new Agency();
        agency.setId(10L);
        agency.setUserId(USER_ID);
        agency.setName("Agence Immobilière Paris");
        agency.setPersonal(false);
        agency.setManagerName("Alice");
        agency.setLegalForm("SAS");
        agency.setSiren("123456789");
        agency.setSiret("12345678900010");
        agency.setAddress("10 rue de la Paix");
        when(agencies.findByUserId(USER_ID)).thenReturn(Optional.of(agency));

        Optional<AgencyDto> dto = service.get();

        assertThat(dto).isPresent();
        assertThat(dto.get().id()).isEqualTo(10L);
        assertThat(dto.get().name()).isEqualTo("Agence Immobilière Paris");
        assertThat(dto.get().isPersonal()).isFalse();
        assertThat(dto.get().managerName()).isEqualTo("Alice");
        assertThat(dto.get().siren()).isEqualTo("123456789");
    }

    @Test
    @DisplayName("save() creates a new agency when none exists")
    void saveCreatesNew() {
        when(agencies.findByUserId(USER_ID)).thenReturn(Optional.empty());
        when(agencies.save(any())).thenAnswer(invocation -> {
            Agency saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        AgencyRequest request = new AgencyRequest("Mon Agence", false, "Bob", "SARL", "987654321", "98765432100012",
                "20 avenue Foch");
        AgencyDto dto = service.save(request);

        assertThat(dto.id()).isEqualTo(1L);
        assertThat(dto.name()).isEqualTo("Mon Agence");
        assertThat(dto.isPersonal()).isFalse();
        assertThat(dto.managerName()).isEqualTo("Bob");
        assertThat(dto.legalForm()).isEqualTo("SARL");
        assertThat(dto.siren()).isEqualTo("987654321");
        assertThat(dto.siret()).isEqualTo("98765432100012");
        assertThat(dto.address()).isEqualTo("20 avenue Foch");
        verify(agencies).save(any(Agency.class));
    }

    @Test
    @DisplayName("save() clears corporate fields when isPersonal is true")
    void savePersonalClearsCorporateFields() {
        Agency existing = new Agency();
        existing.setId(5L);
        existing.setUserId(USER_ID);
        existing.setName("Ancienne Agence");
        existing.setPersonal(false);
        existing.setLegalForm("SAS");
        existing.setSiren("111222333");
        existing.setSiret("11122233300010");
        existing.setAddress("Ancienne adresse");
        when(agencies.findByUserId(USER_ID)).thenReturn(Optional.of(existing));
        when(agencies.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        AgencyRequest request = new AgencyRequest("Gestion Martin", true, "Martin", "SARL", "999888777",
                "99988877700010", "Nouvelle adresse");
        AgencyDto dto = service.save(request);

        assertThat(dto.id()).isEqualTo(5L);
        assertThat(dto.name()).isEqualTo("Gestion Martin");
        assertThat(dto.isPersonal()).isTrue();
        assertThat(dto.managerName()).isEqualTo("Martin");
        assertThat(dto.legalForm()).isNull();
        assertThat(dto.siren()).isNull();
        assertThat(dto.siret()).isNull();
        assertThat(dto.address()).isNull();
    }
}
