package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Company;

public interface CompanyRepository extends JpaRepository<Company, Long> {

    List<Company> findAllByDeletedFalseOrderByNameAscIdAsc();

    List<Company> findAllByUserIdAndDeletedFalseOrderByNameAscIdAsc(Long userId);

    Optional<Company> findByIdAndDeletedFalse(Long id);

    Optional<Company> findByIdAndUserId(Long id, Long userId);

    Optional<Company> findByIdAndUserIdAndDeletedFalse(Long id, Long userId);

    Optional<Company> findFirstByDeletedFalseOrderByIdAsc();

    Optional<Company> findFirstByUserIdAndDeletedFalseOrderByIdAsc(Long userId);

    boolean existsBySirenAndDeletedFalse(String siren);

    boolean existsBySirenAndDeletedFalseAndIdNot(String siren, Long id);

    boolean existsByUserIdAndSirenAndDeletedFalse(Long userId, String siren);

    boolean existsByUserIdAndSirenAndDeletedFalseAndIdNot(Long userId, String siren, Long id);
}
