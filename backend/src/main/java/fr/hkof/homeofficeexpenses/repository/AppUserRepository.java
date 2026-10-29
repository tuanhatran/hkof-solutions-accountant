package fr.hkof.homeofficeexpenses.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.hkof.homeofficeexpenses.domain.AppUser;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    Optional<AppUser> findByConfirmationTokenHash(String confirmationTokenHash);
}
