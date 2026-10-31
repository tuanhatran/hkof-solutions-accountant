package fr.hkof.homeofficeexpenses.domain;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

/**
 * A landlord natural person: the party issuing rent receipts and signing leases. Landlords
 * share the person table with tenants and employees and are never employees.
 */
@Entity
@DiscriminatorValue("LANDLORD")
public class Landlord extends Person {
}
