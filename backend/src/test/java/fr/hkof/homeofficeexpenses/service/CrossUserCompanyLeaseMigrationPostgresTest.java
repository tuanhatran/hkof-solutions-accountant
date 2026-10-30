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
 * Verifies {@code V27__cross_user_company_lease.sql} on a real PostgreSQL instance: active
 * company-lease uniqueness stays scoped to the landlord account, so two accounts may each
 * keep a company lease for the same corporate tenant, while a duplicate inside one account
 * is still rejected. H2 runs with Flyway disabled and does not enforce partial unique
 * indexes, so this test needs a container.
 */
@Testcontainers(disabledWithoutDocker = true)
class CrossUserCompanyLeaseMigrationPostgresTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @Test
    @DisplayName("V27 keeps active company-lease uniqueness scoped per account")
    void allowsTheSameCompanyAcrossAccounts() throws Exception {
        resetSchema();
        migrateTo("26");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO app_user (id, email, password_hash, confirmed, must_change_password,
                        created_at, updated_at)
                    VALUES (100, 'other.owner@example.test', 'x', TRUE, FALSE, NOW(), NOW())
                    """);
            statement.execute("INSERT INTO address (id, label, user_id, deleted, created_at)"
                    + " VALUES (100, '10 rue du Bail', 1, FALSE, NOW())");
            statement.execute("INSERT INTO person (id, kind, name, user_id, deleted, created_at)"
                    + " VALUES (100, 'PERSON', 'Bailleur A', 1, FALSE, NOW())");
            statement.execute("INSERT INTO person (id, kind, name, user_id, deleted, created_at)"
                    + " VALUES (101, 'PERSON', 'Bailleur B', 100, FALSE, NOW())");
            statement.execute("INSERT INTO company (id, name, user_id, deleted, created_at)"
                    + " VALUES (100, 'Société ABC', 1, FALSE, NOW())");
            statement.execute(leaseInsert(100, 1, 100, 100));
        }

        migrateTo("27");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            // Another account references the same company: allowed by the per-account index.
            statement.execute(leaseInsert(101, 100, 101, 100));
            assertThat(count(statement,
                    "SELECT COUNT(*) FROM lease WHERE company_id = 100 AND NOT deleted AND company_lease"))
                    .isEqualTo(2);
            assertThat(count(statement, "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'lease'"
                    + " AND indexname = 'ux_lease_company_active'")).isZero();
            assertThat(count(statement, "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'lease'"
                    + " AND indexname = 'ux_lease_user_active_company'")).isEqualTo(1);

            // A duplicate inside one account is still rejected.
            assertThatThrownBy(() -> statement.execute(leaseInsert(102, 100, 101, 100)))
                    .isInstanceOf(SQLException.class);
        }
    }

    private String leaseInsert(long id, long userId, long landlordId, long companyId) {
        return """
                INSERT INTO lease (id, user_id, landlord_id, tenant_id, company_id, company_lease, address_id,
                    rent_excl_charges, charges, deleted, created_at)
                VALUES (%d, %d, %d, NULL, %d, TRUE, 100, 800.00, 50.00, FALSE, NOW())
                """.formatted(id, userId, landlordId, companyId);
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

    private long count(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }
}
