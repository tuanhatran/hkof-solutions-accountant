package fr.hkof.homeofficeexpenses.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MultiTenantLeaseTest {

    @Test
    @DisplayName("A lease carries several tenants and flags the primary one")
    void carriesSeveralTenants() {
        Tenant tenant = new Tenant();
        tenant.setId(7L);
        Lease lease = new Lease();
        lease.setId(3L);

        LeaseTenant primary = new LeaseTenant();
        primary.setId(1L);
        primary.setLease(lease);
        primary.setPerson(tenant);
        primary.setPrimary(true);

        LeaseTenant secondary = new LeaseTenant();
        secondary.setId(2L);
        secondary.setLease(lease);
        secondary.setPerson(new Tenant());
        secondary.setPrimary(false);

        lease.getTenants().add(primary);
        lease.getTenants().add(secondary);

        assertThat(lease.getTenants()).containsExactly(primary, secondary);
        assertThat(primary.getId()).isEqualTo(1L);
        assertThat(primary.getLease()).isSameAs(lease);
        assertThat(primary.getPerson()).isSameAs(tenant);
        assertThat(primary.isPrimary()).isTrue();
        assertThat(secondary.isPrimary()).isFalse();
    }

    @Test
    @DisplayName("Profile fields capture phone, address note, SIRET and onboarding completion")
    void carriesOnboardingProfileFields() {
        Person person = new Person();
        person.setPhone("06 12 34 56 78");
        person.setAddressNote("Bâtiment B, 3e étage");

        assertThat(person.getPhone()).isEqualTo("06 12 34 56 78");
        assertThat(person.getAddressNote()).isEqualTo("Bâtiment B, 3e étage");

        Company company = new Company();
        company.setSiret("123 456 789 00012");
        assertThat(company.getSiret()).isEqualTo("123 456 789 00012");

        AppUser user = new AppUser();
        assertThat(user.isOnboardingCompleted()).isFalse();
        user.setOnboardingCompleted(true);
        assertThat(user.isOnboardingCompleted()).isTrue();
    }
}
