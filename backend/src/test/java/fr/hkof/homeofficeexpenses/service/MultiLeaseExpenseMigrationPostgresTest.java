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

    @Test
    @DisplayName("V17 scopes statement versions, the active statement and drafts per lease")
    void scopesStatementsAndDraftsPerLease() throws Exception {
        resetSchema();
        migrateTo("16");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO company (id, name, deleted, created_at) VALUES (3, 'Société C', FALSE, NOW())");
            // One legacy row per scope, inserted before V17 adds the lease column to drafts.
            statement.execute(statementInsert(10, 3, 1, null, "ACTIVE"));
            statement.execute("INSERT INTO document_draft (id, draft_type, billing_month, company_id, payload, saved_at)"
                    + " VALUES (20, 'EXPENSE_STATEMENT', '2026-01', 3, '{}', NOW())");
        }

        migrateTo("17");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(count(statement, "SELECT COUNT(*) FROM expense_statement")).isEqualTo(1);
            assertThat(count(statement, "SELECT COUNT(*) FROM document_draft")).isEqualTo(1);
            assertThat(count(statement, "SELECT COUNT(*) FROM information_schema.columns"
                    + " WHERE table_name = 'document_draft' AND column_name = 'lease_id'")).isEqualTo(1);

            // Two leases of a company and month keep the same version independently.
            statement.execute(statementInsert(11, 3, 1, 7L, "ACTIVE"));
            statement.execute(statementInsert(12, 3, 1, 8L, "ACTIVE"));
            assertThat(count(statement, "SELECT COUNT(*) FROM expense_statement")).isEqualTo(3);

            // One ACTIVE statement per company + month + lease, legacy NULL being its own scope.
            assertThatThrownBy(() -> statement.execute(statementInsert(13, 3, 2, 7L, "ACTIVE")))
                    .isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> statement.execute(statementInsert(13, 3, 2, null, "ACTIVE")))
                    .isInstanceOf(SQLException.class);
            statement.execute(statementInsert(14, 3, 1, 9L, "ACTIVE"));
            statement.execute(statementInsert(15, 3, 2, 7L, "ARCHIVED"));
            // Versions stay unique per lease scope.
            assertThatThrownBy(() -> statement.execute(statementInsert(16, 3, 1, 8L, "ARCHIVED")))
                    .isInstanceOf(SQLException.class);
            statement.execute(statementInsert(17, 3, 2, null, "ARCHIVED"));

            // One active statement draft per company + month + lease.
            statement.execute(draftInsert(21, 3, 7L));
            statement.execute(draftInsert(22, 3, 8L));
            assertThatThrownBy(() -> statement.execute(draftInsert(23, 3, 7L)))
                    .isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> statement.execute(draftInsert(24, 3, null)))
                    .isInstanceOf(SQLException.class);
        }
    }

    @Test
    @DisplayName("V18 allows the same code on two leases and keeps one code per scope")
    void scopesExpenseItemCodesPerLease() throws Exception {
        resetSchema();
        migrateTo("17");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO company (id, name, deleted, created_at) VALUES (3, 'Société codes', FALSE, NOW())");
            statement.execute(itemInsert(1, 3, 4L, "loyer"));
            statement.execute(itemInsert(2, 3, null, "heritage"));
        }

        migrateTo("18");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(count(statement, "SELECT COUNT(*) FROM expense_item")).isEqualTo(2);
            assertThat(singleLong(statement, "SELECT lease_id FROM expense_item WHERE id = 1")).isEqualTo(4L);
            assertThat(singleNull(statement, "SELECT lease_id FROM expense_item WHERE id = 2")).isNull();
            assertThat(count(statement, "SELECT COUNT(*) FROM pg_constraint"
                    + " WHERE conname = 'uq_expense_item_company_code'")).isZero();
            assertThat(count(statement, "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'expense_item'"
                    + " AND indexname = 'uq_expense_item_company_lease_code'")).isEqualTo(1);

            // A second lease of the same company may own the same code.
            statement.execute(itemInsert(3, 3, 5L, "loyer"));
            // Same company, same lease scope, same code collides.
            assertThatThrownBy(() -> statement.execute(itemInsert(4, 3, 4L, "loyer")))
                    .isInstanceOf(SQLException.class);
            // The legacy NULL scope stays its own unique scope.
            assertThatThrownBy(() -> statement.execute(itemInsert(5, 3, null, "heritage")))
                    .isInstanceOf(SQLException.class);
            statement.execute(itemInsert(6, 3, null, "loyer"));
        }
    }

    @Test
    @DisplayName("V18 applies on a fresh database")
    void appliesOnFreshDatabase() throws Exception {
        resetSchema();
        migrateTo("18");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO company (id, name, deleted, created_at) VALUES (3, 'Société fraîche', FALSE, NOW())");
            statement.execute(itemInsert(1, 3, 4L, "loyer"));
            statement.execute(itemInsert(2, 3, 5L, "loyer"));
            assertThat(count(statement, "SELECT COUNT(*) FROM expense_item")).isEqualTo(2);
        }
    }

    private String itemInsert(long id, long companyId, Long leaseId, String code) {
        return """
                INSERT INTO expense_item (id, company_id, lease_id, code, label, pro_rata_pct, periodicity,
                    active, sort_order, multiple_lines_allowed, deleted)
                VALUES (%d, %d, %s, '%s', 'Poste', 100.00, 'MONTHLY', TRUE, 0, FALSE, FALSE)
                """.formatted(id, companyId, leaseId == null ? "NULL" : leaseId, code);
    }

    private String statementInsert(long id, long companyId, int version, Long leaseId, String status) {
        return """
                INSERT INTO expense_statement (id, company_id, lease_id, billing_month, statement_number, total,
                    version, status, created_at)
                VALUES (%d, %d, %s, '2026-01', 'NF-2026-01', 100.00, %d, '%s', NOW())
                """.formatted(id, companyId, leaseId == null ? "NULL" : leaseId, version, status);
    }

    private String draftInsert(long id, long companyId, Long leaseId) {
        return """
                INSERT INTO document_draft (id, draft_type, billing_month, company_id, lease_id, payload, saved_at)
                VALUES (%d, 'EXPENSE_STATEMENT', '2026-01', %d, %s, '{}', NOW())
                """.formatted(id, companyId, leaseId == null ? "NULL" : leaseId);
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
