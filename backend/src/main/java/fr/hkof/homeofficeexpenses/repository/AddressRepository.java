package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Address;

public interface AddressRepository extends JpaRepository<Address, Long> {

    List<Address> findAllByDeletedFalseOrderByLabelAsc();

    List<Address> findAllByUserIdAndDeletedFalseOrderByLabelAsc(Long userId);

    Optional<Address> findFirstByDeletedFalseAndLabelIgnoreCase(String label);

    Optional<Address> findFirstByUserIdAndDeletedFalseAndLabelIgnoreCase(Long userId, String label);
}
