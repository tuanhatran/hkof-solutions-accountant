package fr.hkof.homeofficeexpenses.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.Employee;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    List<Employee> findAllByCompanyIdAndDeletedFalseOrderByLastNameAscFirstNameAscIdAsc(Long companyId);

    List<Employee> findAllByUserIdAndCompanyIdAndDeletedFalseOrderByLastNameAscFirstNameAscIdAsc(Long userId,
            Long companyId);

    Optional<Employee> findByIdAndCompanyIdAndDeletedFalse(Long id, Long companyId);

    Optional<Employee> findByIdAndDeletedFalse(Long id);

    Optional<Employee> findByIdAndUserIdAndDeletedFalse(Long id, Long userId);

    Optional<Employee> findFirstByCompanyIdAndDeletedFalseOrderByIdAsc(Long companyId);

    Optional<Employee> findFirstByUserIdAndCompanyIdAndDeletedFalseOrderByIdAsc(Long userId, Long companyId);

    Optional<Employee> findFirstByCompanyIdAndTitleAndDeletedFalseOrderByIdAsc(Long companyId,
            fr.hkof.homeofficeexpenses.domain.EmployeeTitle title);

    boolean existsByCompanyIdAndEmailIgnoreCaseAndDeletedFalse(Long companyId, String email);

    boolean existsByCompanyIdAndEmailIgnoreCaseAndDeletedFalseAndIdNot(Long companyId, String email, Long id);

    boolean existsByCompanyIdAndDeletedFalse(Long companyId);

    boolean existsByIdAndDeletedFalse(Long id);

    boolean existsByIdAndUserIdAndDeletedFalse(Long id, Long userId);
}
