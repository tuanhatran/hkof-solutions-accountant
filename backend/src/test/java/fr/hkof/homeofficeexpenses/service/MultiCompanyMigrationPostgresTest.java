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
 * Verifies {@code V7__multi_company.sql} on a real PostgreSQL instance: the legacy settings
 * row becomes company 1, every legacy row is scoped to it, the seeded CEO owns the legacy
 * signatures, and item codes / statement versions are unique per company.
 */
@Testcontainers(disabledWithoutDocker = true)
class MultiCompanyMigrationPostgresTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @Test
    @DisplayName("V7 backfills company 1 and scopes expense items, statements, leases and signatures")
    void backfillsLegacyData() throws Exception {
        resetSchema();
        migrateTo("6");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO settings (id, company_name, legal_form, siren, company_address, manager_name,
                        home_address, total_area, business_area, issue_place, updated_at)
                    VALUES (1, 'HKOF', 'EURL', '123456789', '12 rue de la République, 75000 Paris',
                        'Gérant historique', '12 rue de la République, 75000 Paris', 70.00, 25.00, 'Paris', NOW())
                    """);
            statement.execute("""
                    INSERT INTO expense_item (code, label, pro_rata_pct, periodicity, sort_order)
                    VALUES ('gaz', 'Gaz', 35.71, 'MONTHLY', 10)
                    """);
            statement.execute("""
                    INSERT INTO expense_statement (billing_month, statement_number, total, version, status, created_at)
                    VALUES ('2026-10', 'NF-2026-10', 100.00, 1, 'ACTIVE', NOW())
                    """);
            statement.execute("""
                    INSERT INTO landlord (name, deleted, created_at) VALUES ('Bailleur', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO tenant (name, deleted, created_at) VALUES ('Locataire', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO lease (landlord_id, tenant_id, property_address, rent_excl_charges, charges,
                        deleted, created_at)
                    SELECT id, (SELECT id FROM tenant), '12 rue de la République', 900.00, 50.00, FALSE, NOW()
                    FROM landlord
                    """);
            statement.execute("""
                    INSERT INTO signature (type, name, mime_type, image, deleted, created_at)
                    VALUES ('ENTREPRISE_CEO', 'Signature gérant', 'image/png', '\\x89504e47'::bytea, FALSE, NOW())
                    """);
        }

        migrateTo("7");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(singleString(statement, "SELECT name FROM company WHERE id = 1")).isEqualTo("HKOF");
            assertThat(singleString(statement, "SELECT siren FROM company WHERE id = 1")).isEqualTo("123456789");
            assertThat(singleString(statement, "SELECT home_address FROM company WHERE id = 1"))
                    .isEqualTo("12 rue de la République, 75000 Paris");

            long employeeId = singleLong(statement,
                    "SELECT id FROM employee WHERE company_id = 1 AND title = 'CEO' AND NOT deleted");
            assertThat(singleString(statement, "SELECT first_name FROM employee WHERE id = " + employeeId))
                    .isEqualTo("Gérant historique");

            assertThat(singleLong(statement, "SELECT company_id FROM expense_item")).isEqualTo(1);
            assertThat(singleLong(statement, "SELECT company_id FROM expense_statement")).isEqualTo(1);
            assertThat(singleLong(statement, "SELECT company_id FROM lease")).isEqualTo(1);
            assertThat(singleLong(statement, "SELECT employee_id FROM signature WHERE type = 'ENTREPRISE_CEO'"))
                    .isEqualTo(employeeId);
            assertThat(singleLong(statement, "SELECT company_id FROM signature WHERE type = 'ENTREPRISE_CEO'"))
                    .isEqualTo(1);

            assertThat(count(statement, """
                    SELECT COUNT(*) FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'settings'
                    """)).isZero();
            assertThat(count(statement, """
                    SELECT COUNT(*) FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'settings_legacy'
                    """)).isEqualTo(1);
        }
    }

    @Test
    @DisplayName("V7 scopes item codes and statement versions per company")
    void scopesUniquenessPerCompany() throws Exception {
        resetSchema();
        migrateTo("6");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO expense_item (code, label, pro_rata_pct, periodicity, sort_order)
                    VALUES ('gaz', 'Gaz', 35.71, 'MONTHLY', 10)
                    """);
            statement.execute("""
                    INSERT INTO expense_statement (billing_month, statement_number, total, version, status, created_at)
                    VALUES ('2026-10', 'NF-2026-10', 100.00, 1, 'ACTIVE', NOW())
                    """);
        }

        migrateTo("7");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO company (id, name, deleted, created_at) VALUES (2, 'Seconde société', FALSE, NOW())
                    """);

            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO expense_item (company_id, code, label, pro_rata_pct, periodicity, sort_order)
                    VALUES (1, 'gaz', 'Gaz bis', 10.00, 'MONTHLY', 20)
                    """))
                    .isInstanceOf(SQLException.class);
            statement.execute("""
                    INSERT INTO expense_item (company_id, code, label, pro_rata_pct, periodicity, sort_order)
                    VALUES (2, 'gaz', 'Gaz société 2', 10.00, 'MONTHLY', 20)
                    """);

            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO expense_statement (company_id, billing_month, statement_number, total, version,
                        status, created_at)
                    VALUES (1, '2026-10', 'NF-2026-10-bis', 200.00, 1, 'ARCHIVED', NOW())
                    """))
                    .isInstanceOf(SQLException.class);
            statement.execute("""
                    INSERT INTO expense_statement (company_id, billing_month, statement_number, total, version,
                        status, created_at)
                    VALUES (2, '2026-10', 'NF-2026-10', 200.00, 1, 'ACTIVE', NOW())
                    """);

            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO signature (type, name, mime_type, image, deleted, created_at)
                    VALUES ('EMPLOYEE', 'Signature orpheline', 'image/png', '\\x89504e47'::bytea, FALSE, NOW())
                    """))
                    .isInstanceOf(SQLException.class);
        }
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
            return result.getLong(1);
        }
    }

    private String singleString(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }
}
