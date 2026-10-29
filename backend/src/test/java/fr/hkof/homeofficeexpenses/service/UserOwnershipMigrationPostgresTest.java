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
 * Verifies {@code V20__user_ownership.sql} on a real PostgreSQL instance: pre-V20 companies,
 * leases, expense items, addresses and employees are backfilled to thtran, the ownership
 * columns become mandatory, and the siren and address-label uniqueness become per account.
 * A fresh database must also migrate to latest with every seeded row owned by thtran.
 */
@Testcontainers(disabledWithoutDocker = true)
class UserOwnershipMigrationPostgresTest {

    private static final String THTRAN_EMAIL = "thtran@homeofficeexpenses.local";

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @Test
    @DisplayName("V20 backfills the company tree to thtran and enforces per-account uniqueness")
    void backfillsLegacyRows() throws Exception {
        resetSchema();
        migrateTo("19");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO app_user (email, password_hash, confirmed, must_change_password, created_at, updated_at)
                    VALUES ('thtran@homeofficeexpenses.local', 'seed', TRUE, TRUE, NOW(), NOW())
                    """);
            statement.execute("""
                    INSERT INTO company (id, name, siren, deleted, created_at)
                    VALUES (2, 'Ancienne société', '111 222 333', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO address (id, label, deleted, created_at)
                    VALUES (1, '1 rue Ancienne', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO person (id, kind, name, deleted, created_at)
                    VALUES (100, 'PERSON', 'Bailleur ancien', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO person (id, kind, company_id, first_name, last_name, title, deleted, created_at)
                    VALUES (101, 'EMPLOYEE', 1, 'Ancien', 'Salarié', 'CEO', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO lease (id, landlord_id, company_id, company_lease, address_id,
                        rent_excl_charges, charges, deleted, created_at)
                    VALUES (1, 100, 1, TRUE, 1, 1300.00, 0.00, FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO expense_item (id, company_id, code, label, pro_rata_pct, periodicity,
                        active, sort_order, multiple_lines_allowed, deleted)
                    VALUES (1, 1, 'gaz', 'Gaz', 35.71, 'MONTHLY', TRUE, 10, FALSE, FALSE)
                    """);
        }

        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            long owner = ownerId(statement, THTRAN_EMAIL);
            assertThat(singleLong(statement, "SELECT user_id FROM company WHERE id = 1")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM company WHERE id = 2")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM lease WHERE id = 1")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM expense_item WHERE id = 1")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM address WHERE id = 1")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM person WHERE id = 101")).isEqualTo(owner);
            assertThat(singleNull(statement, "SELECT user_id FROM person WHERE kind = 'PERSON' LIMIT 1")).isNull();

            for (String table : List.of("company", "lease", "expense_item", "address")) {
                assertThat(singleLong(statement, """
                        SELECT COUNT(*) FROM information_schema.columns
                        WHERE table_name = '%s' AND column_name = 'user_id' AND is_nullable = 'NO'
                        """.formatted(table))).isEqualTo(1);
            }

            long other = insertOtherUser(statement);
            statement.execute("""
                    INSERT INTO company (id, name, siren, user_id, deleted, created_at)
                    VALUES (10, 'Autre société', '111 222 333', %d, FALSE, NOW())
                    """.formatted(other));
            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO company (id, name, siren, user_id, deleted, created_at)
                    VALUES (11, 'Doublon', '111 222 333', %d, FALSE, NOW())
                    """.formatted(owner))).isInstanceOf(SQLException.class);

            statement.execute("""
                    INSERT INTO address (id, label, user_id, deleted, created_at)
                    VALUES (10, '1 rue Ancienne', %d, FALSE, NOW())
                    """.formatted(other));
            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO address (id, label, user_id, deleted, created_at)
                    VALUES (11, '1 RUE ANCIENNE', %d, FALSE, NOW())
                    """.formatted(owner))).isInstanceOf(SQLException.class);
        }
    }

    @Test
    @DisplayName("A fresh database migrates to latest with every seeded row owned by thtran")
    void migratesFreshDatabase() throws Exception {
        resetSchema();
        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(singleLong(statement, """
                    SELECT COUNT(*) FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local'
                    """)).isEqualTo(1);
            long owner = ownerId(statement, THTRAN_EMAIL);
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM company WHERE user_id IS NULL")).isZero();
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM company WHERE user_id = " + owner))
                    .isEqualTo(singleLong(statement, "SELECT COUNT(*) FROM company"));
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM person WHERE kind = 'EMPLOYEE'"))
                    .isEqualTo(singleLong(statement, """
                            SELECT COUNT(*) FROM person WHERE kind = 'EMPLOYEE' AND user_id = %d
                            """.formatted(owner)));
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

    private long insertOtherUser(Statement statement) throws SQLException {
        statement.execute("""
                INSERT INTO app_user (email, password_hash, confirmed, must_change_password, created_at, updated_at)
                VALUES ('autre@homeofficeexpenses.local', 'seed', TRUE, FALSE, NOW(), NOW())
                """);
        return ownerId(statement, "autre@homeofficeexpenses.local");
    }

    private long singleLong(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getLong(1);
        }
    }

    private Long singleNull(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            result.next();
            long value = result.getLong(1);
            return result.wasNull() ? null : value;
        }
    }
}
