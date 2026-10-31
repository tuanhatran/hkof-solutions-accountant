package fr.hkof.homeofficeexpenses.domain;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

/**
 * A tenant natural person: a lease party paying rent. Tenants share the person table with
 * landlords and employees, use the shared {@code person.email} column and are never employees.
 */
@Entity
@DiscriminatorValue("TENANT")
public class Tenant extends Person {
}
