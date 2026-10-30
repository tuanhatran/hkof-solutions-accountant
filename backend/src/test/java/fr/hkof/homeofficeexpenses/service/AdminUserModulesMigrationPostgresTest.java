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
 * Verifies {@code V26__admin_user_modules.sql} on a real PostgreSQL instance: the role and both
 * module flags are added to existing accounts, thtran becomes ADMIN, other accounts stay USER
 * with both modules enabled, and a fresh database migrates to latest.
 */
@Testcontainers(disabledWithoutDocker = true)
class AdminUserModulesMigrationPostgresTest {

    private static final String THTRAN_EMAIL = "thtran@homeofficeexpenses.local";
    private static final String E2E_EMAIL = "e2e@homeofficeexpenses.local";

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @Test
    @DisplayName("V26 adds role and module flags and promotes the seeded owner to ADMIN")
    void upgradesExistingAccounts() throws Exception {
        resetSchema();
        migrateTo("25");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO app_user (email, password_hash, confirmed, must_change_password, created_at, updated_at)
                    VALUES ('e2e@homeofficeexpenses.local', 'seed', TRUE, FALSE, NOW(), NOW())
                    """);
        }

        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(text(statement, "SELECT role FROM app_user WHERE lower(email) = '" + THTRAN_EMAIL + "'"))
                    .isEqualTo("ADMIN");
            assertThat(text(statement, "SELECT role FROM app_user WHERE lower(email) = '" + E2E_EMAIL + "'"))
                    .isEqualTo("USER");
            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM app_user WHERE company_enabled AND lmnp_enabled")).isEqualTo(2);
            for (String column : new String[] {"role", "company_enabled", "lmnp_enabled"}) {
                assertThat(singleLong(statement, """
                        SELECT COUNT(*) FROM information_schema.columns
                        WHERE table_name = 'app_user' AND column_name = '%s' AND is_nullable = 'NO'
                        """.formatted(column))).isEqualTo(1);
            }
            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO app_user (email, password_hash, confirmed, must_change_password, role,
                        created_at, updated_at)
                    VALUES ('bad@example.test', 'seed', TRUE, FALSE, 'OWNER', NOW(), NOW())
                    """))
                    .isInstanceOf(SQLException.class);
        }
    }

    @Test
    @DisplayName("A fresh database migrates to latest with thtran as ADMIN")
    void migratesFreshDatabase() throws Exception {
        resetSchema();
        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(text(statement, "SELECT role FROM app_user WHERE lower(email) = '" + THTRAN_EMAIL + "'"))
                    .isEqualTo("ADMIN");
            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM app_user WHERE company_enabled AND lmnp_enabled")).isGreaterThan(0);
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

    private String text(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getString(1);
        }
    }

    private long singleLong(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getLong(1);
        }
    }
}
