package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Address;

public interface AddressRepository extends JpaRepository<Address, Long> {

    List<Address> findAllByDeletedFalseOrderByLabelAsc();

    Optional<Address> findFirstByDeletedFalseAndLabelIgnoreCase(String label);
}
