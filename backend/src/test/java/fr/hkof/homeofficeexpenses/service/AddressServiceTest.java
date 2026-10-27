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

import fr.hkof.homeofficeexpenses.domain.Address;
import fr.hkof.homeofficeexpenses.repository.AddressRepository;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.AddressDto;

class AddressServiceTest {

    private AddressRepository addresses;
    private AddressService service;

    @BeforeEach
    void setUp() {
        addresses = mock(AddressRepository.class);
        service = new AddressService(addresses,
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private Address address(Long id, String label) {
        Address address = new Address();
        address.setId(id);
        address.setLabel(label);
        return address;
    }

    @Test
    @DisplayName("The address list maps every non deleted label")
    void lists() {
        when(addresses.findAllByDeletedFalseOrderByLabelAsc())
                .thenReturn(List.of(address(1L, "12 rue de la République"), address(2L, "8 rue du Test")));

        assertThat(service.list())
                .containsExactly(new AddressDto(1L, "12 rue de la République"), new AddressDto(2L, "8 rue du Test"));
    }

    @Test
    @DisplayName("An existing address is reused with a trimmed, case-insensitive label")
    void reusesExistingAddress() {
        Address existing = address(4L, "12 rue de la République");
        when(addresses.findFirstByDeletedFalseAndLabelIgnoreCase("12 rue de la République"))
                .thenReturn(Optional.of(existing));

        assertThat(service.findOrCreate("  12 rue de la République  ")).isSameAs(existing);
        verify(addresses, never()).save(any());
    }

    @Test
    @DisplayName("A new address is created with the trimmed label and the current instant")
    void createsAddress() {
        when(addresses.findFirstByDeletedFalseAndLabelIgnoreCase("8 rue du Test")).thenReturn(Optional.empty());
        when(addresses.save(any(Address.class))).thenAnswer(invocation -> {
            Address saved = invocation.getArgument(0);
            saved.setId(5L);
            return saved;
        });

        Address created = service.findOrCreate("  8 rue du Test ");

        assertThat(created.getId()).isEqualTo(5L);
        assertThat(created.getLabel()).isEqualTo("8 rue du Test");
        assertThat(created.isDeleted()).isFalse();
        assertThat(created.getCreatedAt()).isEqualTo(Instant.parse("2026-10-01T10:00:00Z"));
    }

    @Test
    @DisplayName("A blank address label is rejected in French")
    void rejectsBlankLabel() {
        assertThatThrownBy(() -> service.findOrCreate("  "))
                .isInstanceOf(BusinessException.class)
                .hasMessage("L'adresse du bien est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("ADDRESS_REQUIRED"));
        assertThatThrownBy(() -> service.findOrCreate(null))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("ADDRESS_REQUIRED"));
        verify(addresses, never()).save(any());
    }
}
