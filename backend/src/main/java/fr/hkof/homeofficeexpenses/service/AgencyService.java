package fr.hkof.homeofficeexpenses.service;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Agency;
import fr.hkof.homeofficeexpenses.repository.AgencyRepository;
import fr.hkof.homeofficeexpenses.web.dto.AgencyDtos.AgencyDto;
import fr.hkof.homeofficeexpenses.web.dto.AgencyDtos.AgencyRequest;

@Service
public class AgencyService {

    private final AgencyRepository agencies;
    private final OwnershipContext ownership;
    private final Clock clock;

    public AgencyService(AgencyRepository agencies, OwnershipContext ownership, Clock clock) {
        this.agencies = agencies;
        this.ownership = ownership;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Optional<AgencyDto> get() {
        return agencies.findByUserId(ownership.currentUserId()).map(this::toDto);
    }

    @Transactional
    public AgencyDto save(AgencyRequest request) {
        Long userId = ownership.currentUserId();
        Agency agency = agencies.findByUserId(userId).orElseGet(() -> {
            Agency fresh = new Agency();
            fresh.setUserId(userId);
            fresh.setCreatedAt(Instant.now(clock));
            return fresh;
        });

        apply(agency, request);
        agency.setUpdatedAt(Instant.now(clock));
        return toDto(agencies.save(agency));
    }

    private void apply(Agency agency, AgencyRequest request) {
        agency.setName(OptionalTexts.trimToNull(request.name()));
        agency.setPersonal(request.isPersonal());
        agency.setManagerName(OptionalTexts.trimToNull(request.managerName()));
        if (request.isPersonal()) {
            agency.setLegalForm(null);
            agency.setSiren(null);
            agency.setSiret(null);
            agency.setAddress(null);
        } else {
            agency.setLegalForm(OptionalTexts.trimToNull(request.legalForm()));
            agency.setSiren(OptionalTexts.trimToNull(request.siren()));
            agency.setSiret(OptionalTexts.trimToNull(request.siret()));
            agency.setAddress(OptionalTexts.trimToNull(request.address()));
        }
    }

    public AgencyDto toDto(Agency agency) {
        return new AgencyDto(
                agency.getId(),
                agency.getName(),
                agency.isPersonal(),
                agency.getManagerName(),
                agency.getLegalForm(),
                agency.getSiren(),
                agency.getSiret(),
                agency.getAddress());
    }
}
