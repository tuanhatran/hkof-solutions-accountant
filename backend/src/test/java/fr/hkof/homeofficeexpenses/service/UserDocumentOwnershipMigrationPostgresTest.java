package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Verifies {@code V21__document_ownership.sql} on a real PostgreSQL instance: pre-V21 rent
 * receipts, additional charges, expense statements and expense lines are backfilled to
 * thtran, the ownership columns become mandatory and every table gets an owner index.
 * A fresh database must also migrate to latest with no unowned document.
 */
@Testcontainers(disabledWithoutDocker = true)
class UserDocumentOwnershipMigrationPostgresTest {

    private static final String THTRAN_EMAIL = "thtran@homeofficeexpenses.local";

    private static final List<String> DOCUMENT_TABLES = List.of("rent_receipt", "rent_receipt_additional_charge",
            "expense_statement", "expense_line");

    private static final List<String> OWNER_INDEXES = List.of("ix_rent_receipt_user_month",
            "ix_rent_receipt_additional_charge_user_receipt", "ix_expense_statement_user_company_month",
            "ix_expense_line_user_statement");

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @Test
    @DisplayName("V21 backfills legacy documents to thtran, enforces NOT NULL and creates owner indexes")
    void backfillsLegacyDocuments() throws Exception {
        resetSchema();
        migrateTo("20");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            long owner = ownerId(statement, THTRAN_EMAIL);
            // V7 seeds company id 1; legacy documents reference it before V21 exists.
            statement.execute("""
                    INSERT INTO expense_item (id, company_id, user_id, code, label, pro_rata_pct, periodicity,
                        active, sort_order, multiple_lines_allowed, deleted)
                    VALUES (1, 1, %d, 'gaz', 'Gaz', 35.71, 'MONTHLY', TRUE, 10, FALSE, FALSE)
                    """.formatted(owner));
            statement.execute("""
                    INSERT INTO rent_receipt (id, company_id, billing_month, period_start, period_end,
                        rent_excl_charges, charges, total, version, status, created_at)
                    VALUES (1, 1, '2026-01', DATE '2026-01-01', DATE '2026-01-31',
                        900.00, 50.00, 950.00, 1, 'ACTIVE', NOW())
                    """);
            statement.execute("""
                    INSERT INTO rent_receipt_additional_charge (id, rent_receipt_id, label, amount, position)
                    VALUES (1, 1, 'Eau', 10.00, 0)
                    """);
            statement.execute("""
                    INSERT INTO expense_statement (id, company_id, billing_month, statement_number, total,
                        version, status, created_at)
                    VALUES (1, 1, '2026-01', 'NF-2026-01', 100.00, 1, 'ACTIVE', NOW())
                    """);
            statement.execute("""
                    INSERT INTO expense_line (id, statement_id, item_id, amount_incl_vat, monthly_amount,
                        pro_rata_pct, claimed_amount, amount_source)
                    VALUES (1, 1, 1, 80.00, 80.00, 35.71, 28.57, 'MANUAL')
                    """);
        }

        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            long owner = ownerId(statement, THTRAN_EMAIL);
            assertThat(singleLong(statement, "SELECT user_id FROM rent_receipt WHERE id = 1")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM rent_receipt_additional_charge WHERE id = 1"))
                    .isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM expense_statement WHERE id = 1")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM expense_line WHERE id = 1")).isEqualTo(owner);
            assertOwnershipColumnsAreMandatory(statement);
            assertOwnerIndexesExist(statement);
            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO rent_receipt (id, company_id, billing_month, period_start, period_end,
                        rent_excl_charges, charges, total, version, status, created_at)
                    VALUES (2, 1, '2026-02', DATE '2026-02-01', DATE '2026-02-28',
                        900.00, 50.00, 950.00, 1, 'ACTIVE', NOW())
                    """)).isInstanceOf(SQLException.class);
        }
    }

    @Test
    @DisplayName("A fresh database migrates to latest with every document owned by thtran")
    void migratesFreshDatabase() throws Exception {
        resetSchema();
        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM app_user WHERE lower(email) = '"
                    + THTRAN_EMAIL + "'")).isEqualTo(1);
            long owner = ownerId(statement, THTRAN_EMAIL);
            for (String table : DOCUMENT_TABLES) {
                assertThat(singleLong(statement, "SELECT COUNT(*) FROM " + table + " WHERE user_id IS NULL"))
                        .isZero();
                assertThat(singleLong(statement, "SELECT COUNT(*) FROM " + table + " WHERE user_id = " + owner))
                        .isEqualTo(singleLong(statement, "SELECT COUNT(*) FROM " + table));
            }
            assertOwnershipColumnsAreMandatory(statement);
            assertOwnerIndexesExist(statement);
        }
    }

    private void assertOwnershipColumnsAreMandatory(Statement statement) throws SQLException {
        for (String table : DOCUMENT_TABLES) {
            assertThat(singleLong(statement, """
                    SELECT COUNT(*) FROM information_schema.columns
                    WHERE table_name = '%s' AND column_name = 'user_id' AND is_nullable = 'NO'
                    """.formatted(table))).isEqualTo(1);
        }
    }

    private void assertOwnerIndexesExist(Statement statement) throws SQLException {
        for (String index : OWNER_INDEXES) {
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM pg_indexes WHERE indexname = '" + index + "'"))
                    .isEqualTo(1);
        }
    }

    private Connection connection() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    private Flyway flyway() {
        return Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .cleanDisabled(false)
                .load();
    }

    private void migrate() {
        flyway().migrate();
    }

    private void migrateTo(String target) {
        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .target(target)
                .load()
                .migrate();
    }

    private void resetSchema() {
        flyway().clean();
    }

    private long ownerId(Statement statement, String email) throws SQLException {
        return singleLong(statement, "SELECT id FROM app_user WHERE lower(email) = '" + email + "'");
    }

    private long singleLong(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getLong(1);
        }
    }
}
