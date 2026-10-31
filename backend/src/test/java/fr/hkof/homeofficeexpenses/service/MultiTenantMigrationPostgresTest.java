package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Verifies {@code V29__multi_tenant_leases_and_user_profile.sql} on a real PostgreSQL instance.
 * Every object the migration introduces is proven absent at schema version 28 and present at
 * version 29, legacy lease tenants are backfilled as primary, existing accounts are marked as
 * already onboarded while later registrations keep the default, and the lease uniqueness moves
 * from the active pair to the lease-tenant pair. H2 runs with Flyway disabled and does not
 * enforce partial unique indexes, so this test needs a container.
 */
@Testcontainers(disabledWithoutDocker = true)
class MultiTenantMigrationPostgresTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @Test
    @DisplayName("V29 adds multi-tenant leases and profile columns, backfills legacy rows and swaps uniqueness")
    void addsMultiTenantProfileSchemaAndBackfillsLegacyRows() throws Exception {
        resetSchema();
        migrateTo("28");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(tableCount(statement, "lease_tenant"))
                    .as("lease_tenant must be absent at schema version 28")
                    .isZero();
            assertThat(columnCount(statement, "person", "phone"))
                    .as("person.phone must be absent at schema version 28")
                    .isZero();
            assertThat(columnCount(statement, "person", "address_note"))
                    .as("person.address_note must be absent at schema version 28")
                    .isZero();
            assertThat(columnCount(statement, "company", "siret"))
                    .as("company.siret must be absent at schema version 28")
                    .isZero();
            assertThat(columnCount(statement, "app_user", "onboarding_completed"))
                    .as("app_user.onboarding_completed must be absent at schema version 28")
                    .isZero();
            assertThat(indexCount(statement, "lease_tenant", "ux_lease_tenant_pair"))
                    .as("ux_lease_tenant_pair must be absent at schema version 28")
                    .isZero();
            assertThat(indexCount(statement, "lease", "ux_lease_user_active_pair"))
                    .as("the per-account active-pair index exists at schema version 28")
                    .isEqualTo(1);

            insertLegacyRows(statement);
        }

        migrateTo("29");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(tableCount(statement, "lease_tenant"))
                    .as("V29 must create the lease_tenant join table")
                    .isEqualTo(1);
            assertThat(columnCount(statement, "person", "phone"))
                    .as("V29 must add person.phone")
                    .isEqualTo(1);
            assertThat(columnCount(statement, "person", "address_note"))
                    .as("V29 must add person.address_note")
                    .isEqualTo(1);
            assertThat(columnCount(statement, "company", "siret"))
                    .as("V29 must add company.siret")
                    .isEqualTo(1);
            assertThat(columnCount(statement, "app_user", "onboarding_completed"))
                    .as("V29 must add app_user.onboarding_completed")
                    .isEqualTo(1);
            assertThat(indexDefinition(statement, "lease_tenant", "ux_lease_tenant_pair"))
                    .as("V29 must create the unique lease-tenant pair index")
                    .contains("(lease_id, person_id)");
            assertThat(indexCount(statement, "lease", "ux_lease_user_active_pair"))
                    .as("V29 must drop the legacy active-pair index")
                    .isZero();

            assertThat(count(statement, "SELECT COUNT(*) FROM lease_tenant"))
                    .as("V29 backfills one tenant row per legacy lease")
                    .isEqualTo(2);
            assertThat(count(statement, """
                    SELECT COUNT(*) FROM lease_tenant lt
                    JOIN lease l ON l.id = lt.lease_id
                    WHERE lt.person_id = l.tenant_id AND lt.is_primary
                    """)).as("the legacy lease tenant is backfilled as primary")
                    .isEqualTo(2);
            assertThat(count(statement, "SELECT COUNT(*) FROM app_user WHERE NOT onboarding_completed"))
                    .as("existing accounts are marked as already onboarded")
                    .isZero();
            assertThat(count(statement, "SELECT COUNT(*) FROM app_user WHERE onboarding_completed"))
                    .as("V29 marks every account present at migration time as onboarded")
                    .isEqualTo(count(statement, "SELECT COUNT(*) FROM app_user"));

            // A later registration keeps the column default, so the onboarding guard can route it.
            statement.execute("""
                    INSERT INTO app_user (id, email, password_hash, confirmed, must_change_password,
                        created_at, updated_at)
                    VALUES (200, 'newcomer@example.test', 'x', TRUE, FALSE, NOW(), NOW())
                    """);
            assertThat(count(statement,
                    "SELECT COUNT(*) FROM app_user WHERE email = 'newcomer@example.test'"
                            + " AND NOT onboarding_completed"))
                    .as("a registration after V29 stays not onboarded")
                    .isEqualTo(1);

            // Two leases already share one address (no unique index on lease.address_id).
            assertThat(count(statement, "SELECT COUNT(*) FROM lease WHERE address_id = 100"))
                    .as("several leases may share one address")
                    .isEqualTo(2);

            // One lease carries several tenants now.
            statement.execute("INSERT INTO lease_tenant (lease_id, person_id, is_primary)"
                    + " VALUES (100, 102, FALSE)");
            assertThat(count(statement, "SELECT COUNT(*) FROM lease_tenant WHERE lease_id = 100"))
                    .as("one lease accepts a second tenant")
                    .isEqualTo(2);

            // The same person cannot be attached twice to one lease.
            assertThatThrownBy(() -> statement.execute(
                    "INSERT INTO lease_tenant (lease_id, person_id, is_primary) VALUES (100, 102, FALSE)"))
                    .as("a duplicate (lease_id, person_id) must be rejected")
                    .isInstanceOf(SQLException.class);
        }
    }

    private void insertLegacyRows(Statement statement) throws SQLException {
        statement.execute("""
                INSERT INTO app_user (id, email, password_hash, confirmed, must_change_password,
                    created_at, updated_at)
                VALUES (100, 'legacy@example.test', 'x', TRUE, FALSE, NOW(), NOW())
                """);
        statement.execute("INSERT INTO address (id, label, user_id, deleted, created_at)"
                + " VALUES (100, '10 rue du Bail', 100, FALSE, NOW())");
        statement.execute("INSERT INTO person (id, kind, name, user_id, deleted, created_at)"
                + " VALUES (100, 'PERSON', 'Bailleur', 100, FALSE, NOW())");
        statement.execute("INSERT INTO person (id, kind, name, user_id, deleted, created_at)"
                + " VALUES (101, 'PERSON', 'Locataire A', 100, FALSE, NOW())");
        statement.execute("INSERT INTO person (id, kind, name, user_id, deleted, created_at)"
                + " VALUES (102, 'PERSON', 'Locataire B', 100, FALSE, NOW())");
        statement.execute(leaseInsert(100, 100, 100, 101));
        statement.execute(leaseInsert(101, 100, 100, 102));
    }

    private String leaseInsert(long id, long userId, long landlordId, long tenantId) {
        return """
                INSERT INTO lease (id, user_id, landlord_id, tenant_id, company_lease, address_id,
                    rent_excl_charges, charges, deleted, created_at)
                VALUES (%d, %d, %d, %d, FALSE, 100, 800.00, 50.00, FALSE, NOW())
                """.formatted(id, userId, landlordId, tenantId);
    }

    private Connection connection() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    private void resetSchema() {
        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .cleanDisabled(false)
                .load()
                .clean();
    }

    private void migrateTo(String target) {
        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .target(target)
                .load()
                .migrate();
    }

    private long tableCount(Statement statement, String tableName) throws SQLException {
        return count(statement, "SELECT COUNT(*) FROM information_schema.tables"
                + " WHERE table_schema = 'public' AND table_name = '" + tableName + "'");
    }

    private long columnCount(Statement statement, String tableName, String columnName) throws SQLException {
        return count(statement, "SELECT COUNT(*) FROM information_schema.columns"
                + " WHERE table_schema = 'public' AND table_name = '" + tableName + "'"
                + " AND column_name = '" + columnName + "'");
    }

    private long indexCount(Statement statement, String tableName, String indexName) throws SQLException {
        return count(statement, "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'"
                + " AND tablename = '" + tableName + "' AND indexname = '" + indexName + "'");
    }

    private String indexDefinition(Statement statement, String tableName, String indexName) throws SQLException {
        try (ResultSet result = statement.executeQuery("SELECT indexdef FROM pg_indexes"
                + " WHERE schemaname = 'public' AND tablename = '" + tableName + "'"
                + " AND indexname = '" + indexName + "'")) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private long count(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }
}
