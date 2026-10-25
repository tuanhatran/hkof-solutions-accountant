package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;

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
 * Verifies {@code V11__multi_lease_expenses.sql} on a real PostgreSQL instance: expense items
 * and statements gain a nullable {@code lease_id}, existing rows are backfilled from the single
 * active company lease of their company (lowest id), companies without an active lease keep
 * {@code NULL}, the one-active-lease-per-company index is dropped so a company can hold several
 * leases, and no row is ever deleted. H2 runs with Flyway disabled and does not enforce partial
 * unique indexes, so this test needs a container.
 */
@Testcontainers(disabledWithoutDocker = true)
class MultiLeaseExpenseMigrationPostgresTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @Test
    @DisplayName("V11 backfills lease_id from the active company lease of the same company")
    void backfillsFromCompanyLease() throws Exception {
        resetSchema();
        migrateTo("10");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            // Company 1 already exists after V7's seed; company 3 is the lease-less control.
            statement.execute("INSERT INTO company (id, name, deleted, created_at) VALUES (3, 'Société B', FALSE, NOW())");
            statement.execute("INSERT INTO address (id, label, deleted, created_at) VALUES (1, '1 rue A', FALSE, NOW())");
            statement.execute("INSERT INTO person (id, kind, name, deleted, created_at) VALUES (1, 'PERSON', 'Bailleur 1', FALSE, NOW())");
            statement.execute("INSERT INTO person (id, kind, name, deleted, created_at) VALUES (2, 'PERSON', 'Bailleur 2', FALSE, NOW())");
            // Company 1 has one active company lease (id 1) and a deleted one (id 2).
            statement.execute(companyLeaseInsert(1, 1, 1, true, false));
            statement.execute(companyLeaseInsert(2, 1, 1, true, true));
            statement.execute("INSERT INTO expense_item (id, company_id, code, label, pro_rata_pct, periodicity, active, sort_order, multiple_lines_allowed, deleted)"
                    + " VALUES (1, 1, 'EAU', 'Eau', 100.00, 'MONTHLY', TRUE, 0, FALSE, FALSE)");
            statement.execute("INSERT INTO expense_item (id, company_id, code, label, pro_rata_pct, periodicity, active, sort_order, multiple_lines_allowed, deleted)"
                    + " VALUES (3, 3, 'TEL', 'Téléphone', 100.00, 'MONTHLY', TRUE, 0, FALSE, FALSE)");
            statement.execute("INSERT INTO expense_statement (id, company_id, billing_month, statement_number, total, version, status, created_at)"
                    + " VALUES (1, 1, '2026-01', 'NF-2026-01', 100.00, 1, 'ACTIVE', NOW())");
            statement.execute("INSERT INTO expense_statement (id, company_id, billing_month, statement_number, total, version, status, created_at)"
                    + " VALUES (3, 3, '2026-01', 'NF-2026-01', 200.00, 1, 'ACTIVE', NOW())");
        }

        migrateTo("11");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(singleLong(statement, "SELECT lease_id FROM expense_item WHERE id = 1")).isEqualTo(1L);
            assertThat(singleNull(statement, "SELECT lease_id FROM expense_item WHERE id = 3")).isNull();
            assertThat(singleLong(statement, "SELECT lease_id FROM expense_statement WHERE id = 1")).isEqualTo(1L);
            assertThat(singleNull(statement, "SELECT lease_id FROM expense_statement WHERE id = 3")).isNull();
            assertThat(count(statement, "SELECT COUNT(*) FROM expense_item")).isEqualTo(2);
            assertThat(count(statement, "SELECT COUNT(*) FROM expense_statement")).isEqualTo(2);
            assertThat(count(statement, "SELECT COUNT(*) FROM lease")).isEqualTo(2);
        }
    }

    @Test
    @DisplayName("V11 drops the one-active-lease-per-company index so a company can hold several leases")
    void allowsSeveralActiveCompanyLeases() throws Exception {
        resetSchema();
        migrateTo("10");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO address (id, label, deleted, created_at) VALUES (1, '1 rue A', FALSE, NOW())");
            statement.execute("INSERT INTO person (id, kind, name, deleted, created_at) VALUES (1, 'PERSON', 'Bailleur 1', FALSE, NOW())");
            statement.execute("INSERT INTO person (id, kind, name, deleted, created_at) VALUES (2, 'PERSON', 'Bailleur 2', FALSE, NOW())");
            statement.execute(companyLeaseInsert(1, 1, 1, true, false));
        }

        migrateTo("11");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            // Different landlord keeps the (landlord, company) pair unique; the per-company index is gone.
            statement.execute(companyLeaseInsert(2, 2, 1, true, false));
            assertThat(count(statement,
                    "SELECT COUNT(*) FROM lease WHERE company_id = 1 AND NOT deleted AND company_lease"))
                    .isEqualTo(2);
            assertThat(count(statement,
                    "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'lease' AND indexname = 'ux_lease_company_active'"))
                    .isZero();
        }
    }

    @Test
    @DisplayName("V11 keeps the (landlord, company) uniqueness for active company leases")
    void keepsLandlordCompanyPairUnique() throws Exception {
        resetSchema();
        migrateTo("10");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO address (id, label, deleted, created_at) VALUES (1, '1 rue A', FALSE, NOW())");
            statement.execute("INSERT INTO person (id, kind, name, deleted, created_at) VALUES (1, 'PERSON', 'Bailleur 1', FALSE, NOW())");
            statement.execute(companyLeaseInsert(1, 1, 1, true, false));
        }

        migrateTo("11");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            // Same landlord and same company must still collide: ux_lease_active_company is kept.
            assertThat(count(statement,
                    "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'lease' AND indexname = 'ux_lease_active_company'"))
                    .isEqualTo(1);
        }
    }

    @Test
    @DisplayName("V12 backfills company.active_lease_id from the oldest active lease and keeps orphans NULL")
    void backfillsCompanyActiveLease() throws Exception {
        resetSchema();
        migrateTo("10");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO company (id, name, deleted, created_at) VALUES (3, 'Société B', FALSE, NOW())");
            statement.execute("INSERT INTO address (id, label, deleted, created_at) VALUES (1, '1 rue A', FALSE, NOW())");
            statement.execute("INSERT INTO person (id, kind, name, deleted, created_at) VALUES (1, 'PERSON', 'Bailleur 1', FALSE, NOW())");
            statement.execute("INSERT INTO person (id, kind, name, deleted, created_at) VALUES (2, 'PERSON', 'Bailleur 2', FALSE, NOW())");
            // Company 1: oldest active lease id 1 plus a deleted one (id 2).
            statement.execute(companyLeaseInsert(1, 1, 1, true, false));
            statement.execute(companyLeaseInsert(2, 1, 1, true, true));
        }
        migrateTo("11");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            // A second active lease becomes possible only after V11 drops the one-per-company index.
            statement.execute(companyLeaseInsert(3, 2, 1, true, false));
        }

        migrateTo("12");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(singleLong(statement, "SELECT active_lease_id FROM company WHERE id = 1")).isEqualTo(1L);
            assertThat(singleNull(statement, "SELECT active_lease_id FROM company WHERE id = 3")).isNull();
            assertThat(count(statement, "SELECT COUNT(*) FROM company")).isEqualTo(2);
            assertThat(count(statement, "SELECT COUNT(*) FROM lease")).isEqualTo(3);
        }
    }

    private String companyLeaseInsert(long id, long landlordId, long companyId, boolean companyLease, boolean deleted) {
        return """
                INSERT INTO lease (id, landlord_id, tenant_id, company_id, company_lease, address_id,
                    rent_excl_charges, charges, deleted, created_at)
                VALUES (%d, %d, NULL, %d, %s, 1, 800.00, 50.00, %s, NOW())
                """.formatted(id, landlordId, companyId, companyLease, deleted);
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
        return singleLong(statement, sql);
    }

    private long singleLong(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            long value = result.getLong(1);
            assertThat(result.wasNull()).isFalse();
            return value;
        }
    }

    private Long singleNull(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            long value = result.getLong(1);
            return result.wasNull() ? null : value;
        }
    }
}
