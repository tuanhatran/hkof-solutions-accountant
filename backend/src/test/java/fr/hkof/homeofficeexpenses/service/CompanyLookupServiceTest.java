package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.repository.CompanyRepository;
import fr.hkof.homeofficeexpenses.web.dto.CompanyDtos.CompanyLookupDto;

class CompanyLookupServiceTest {

    private CompanyRepository repository;
    private CompanyLookupService service;

    @BeforeEach
    void setUp() {
        repository = mock(CompanyRepository.class);
        service = new CompanyLookupService(repository);
    }

    private Company company(Long id, Long userId, String name, String siren) {
        Company company = new Company();
        company.setId(id);
        company.setUserId(userId);
        company.setName(name);
        company.setSiren(siren);
        company.setLegalForm("SARL");
        company.setAddress("1 rue de la Paix");
        company.setManagerName("Gérant");
        return company;
    }

    @Test
    @DisplayName("The lookup matches a SIREN with or without spaces across accounts")
    void looksUpAcrossAccounts() {
        when(repository.findAllByDeletedFalseOrderByNameAscIdAsc()).thenReturn(List.of(
                company(4L, 2L, "Société ABC", "987 654 321"),
                company(9L, 1L, "Autre société", "111222333")));

        CompanyLookupDto found = service.lookup("987654321");

        assertThat(found.name()).isEqualTo("Société ABC");
        assertThat(found.siren()).isEqualTo("987 654 321");
        assertThat(found.legalForm()).isEqualTo("SARL");
        assertThat(found.address()).isEqualTo("1 rue de la Paix");
        assertThat(found.managerName()).isEqualTo("Gérant");
    }

    @Test
    @DisplayName("The lookup keeps the lowest id when two accounts share the same SIREN")
    void picksTheOldestCompanyForADuplicateSiren() {
        when(repository.findAllByDeletedFalseOrderByNameAscIdAsc()).thenReturn(List.of(
                company(9L, 2L, "Société récente", "111 222 333"),
                company(3L, 1L, "Société historique", "111222333")));

        assertThat(service.lookup("111 222 333").name()).isEqualTo("Société historique");
    }

    @Test
    @DisplayName("An unknown SIREN is not found in French and a blank SIREN is rejected")
    void rejectsUnknownAndBlankSiren() {
        when(repository.findAllByDeletedFalseOrderByNameAscIdAsc()).thenReturn(List.of());

        assertThatThrownBy(() -> service.lookup("000000000"))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Société introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("COMPANY_NOT_FOUND"));
        assertThatThrownBy(() -> service.lookup("  "))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le SIREN est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("COMPANY_SIREN_REQUIRED"));
    }

    @Test
    @DisplayName("The public company of a lease is readable whatever its owner")
    void findsPublicCompanyAcrossOwners() {
        Company foreign = company(7L, 2L, "Société ABC", "987654321");
        when(repository.findByIdAndDeletedFalse(7L)).thenReturn(Optional.of(foreign));

        assertThat(service.findPublic(7L)).contains(foreign);
        assertThat(service.findPublic(8L)).isEmpty();
    }

    @Test
    @DisplayName("The SIREN entity resolution requires an active company")
    void resolvesEntityBySiren() {
        Company foreign = company(7L, 2L, "Société ABC", "987 654 321");
        when(repository.findAllByDeletedFalseOrderByNameAscIdAsc()).thenReturn(List.of(foreign));

        assertThat(service.entityBySiren("987654321")).isSameAs(foreign);
        assertThatThrownBy(() -> service.entityBySiren("000000000"))
                .isInstanceOf(NotFoundException.class)
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("COMPANY_NOT_FOUND"));
    }
}
