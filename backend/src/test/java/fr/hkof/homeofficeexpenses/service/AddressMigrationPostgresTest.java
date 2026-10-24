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
 * Verifies {@code V9__address.sql} on a real PostgreSQL instance: duplicate property
 * addresses are deduplicated case-insensitively, every lease (logically deleted included)
 * is backfilled, {@code address_id} becomes mandatory and {@code property_address} is
 * dropped.
 */
@Testcontainers(disabledWithoutDocker = true)
class AddressMigrationPostgresTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @Test
    @DisplayName("V9 deduplicates the lease addresses, backfills every lease and drops property_address")
    void migratesAddresses() throws Exception {
        migrateTo("8");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO landlord (name, deleted, created_at) VALUES ('Bailleur', FALSE, NOW())");
            for (int index = 1; index <= 3; index++) {
                statement.execute("INSERT INTO tenant (name, deleted, created_at) VALUES ('Locataire " + index
                        + "', FALSE, NOW())");
            }
            statement.execute("""
                    INSERT INTO lease (landlord_id, tenant_id, property_address, rent_excl_charges, charges,
                        deleted, created_at)
                    VALUES
                        ((SELECT id FROM landlord),
                         (SELECT id FROM tenant ORDER BY id LIMIT 1),
                         '  12 rue de la République  ', 900.00, 50.00, FALSE, NOW()),
                        ((SELECT id FROM landlord),
                         (SELECT id FROM tenant ORDER BY id OFFSET 1 LIMIT 1),
                         '12 RUE DE LA RÉPUBLIQUE', 900.00, 50.00, TRUE, NOW()),
                        ((SELECT id FROM landlord),
                         (SELECT id FROM tenant ORDER BY id OFFSET 2 LIMIT 1),
                         '8 rue du Test', 700.00, 0.00, FALSE, NOW())
                    """);
        }

        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(count(statement, "SELECT COUNT(*) FROM address WHERE NOT deleted")).isEqualTo(2);
            assertThat(count(statement, """
                    SELECT COUNT(*) FROM address WHERE NOT deleted AND label <> btrim(label)
                    """)).isZero();
            assertThat(count(statement, """
                    SELECT COUNT(*) FROM (
                        SELECT lower(label) FROM address WHERE NOT deleted GROUP BY lower(label) HAVING COUNT(*) > 1
                    ) duplicates
                    """)).isZero();

            assertThat(count(statement, "SELECT COUNT(*) FROM lease")).isEqualTo(3);
            assertThat(count(statement, "SELECT COUNT(*) FROM lease WHERE address_id IS NULL")).isZero();
            assertThat(count(statement, """
                    SELECT COUNT(*) FROM lease l JOIN address a ON a.id = l.address_id
                    WHERE a.label = '12 rue de la République'
                    """)).isEqualTo(2);
            assertThat(count(statement, """
                    SELECT COUNT(*) FROM lease l JOIN address a ON a.id = l.address_id
                    WHERE a.label = '8 rue du Test'
                    """)).isEqualTo(1);
            assertThat(count(statement, "SELECT COUNT(*) FROM lease WHERE deleted AND address_id IS NOT NULL")).isEqualTo(1);

            assertThat(count(statement, """
                    SELECT COUNT(*) FROM information_schema.columns
                    WHERE table_name = 'lease' AND column_name = 'property_address'
                    """)).isZero();

            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO lease (landlord_id, tenant_id, rent_excl_charges, charges, deleted, created_at)
                    VALUES ((SELECT id FROM landlord), (SELECT id FROM tenant ORDER BY id LIMIT 1), 100.00, 0.00,
                        TRUE, NOW())
                    """))
                    .isInstanceOf(SQLException.class);
        }
    }

    private Connection connection() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    private void migrate() {
        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .load()
                .migrate();
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
            result.next();
            return result.getLong(1);
        }
    }
}
