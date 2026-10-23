package fr.hkof.homeofficeexpenses.domain;

/**
 * Kind of signature a stored image belongs to.
 *
 * <p>{@code LANDLORD} is proposed by default for a rent receipt and
 * {@code ENTREPRISE_CEO} for an expense statement.</p>
 */
public enum SignatureType {
    LANDLORD,
    ENTREPRISE_CEO
}
