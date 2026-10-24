package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Company;

public interface CompanyRepository extends JpaRepository<Company, Long> {

    List<Company> findAllByDeletedFalseOrderByNameAscIdAsc();

    Optional<Company> findByIdAndDeletedFalse(Long id);

    Optional<Company> findFirstByDeletedFalseOrderByIdAsc();

    boolean existsBySirenAndDeletedFalse(String siren);

    boolean existsBySirenAndDeletedFalseAndIdNot(String siren, Long id);
}
