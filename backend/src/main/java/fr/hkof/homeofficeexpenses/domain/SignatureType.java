package fr.hkof.homeofficeexpenses.domain;

/**
 * Kind of signature a stored image belongs to.
 *
 * <p>{@code LANDLORD} is proposed by default for a rent receipt. An expense statement
 * uses the signature of a company employee: new uploads use {@code EMPLOYEE} while the
 * seeded CEO and legacy rows keep {@code ENTREPRISE_CEO}.</p>
 */
public enum SignatureType {
    LANDLORD,
    ENTREPRISE_CEO,
    EMPLOYEE
}
