package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
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
 * Verifies {@code V5__rent_receipt_configuration.sql} on a real PostgreSQL instance: the
 * settings landlord, tenant, home address, rent and charges become one landlord, one tenant
 * and one lease, existing receipts are backfilled, the moved settings columns are dropped and
 * the partial unique index keeps one active lease per pair. H2 runs with Flyway disabled and
 * does not enforce partial unique indexes, so this test needs a container.
 */
@Testcontainers(disabledWithoutDocker = true)
class RentConfigurationMigrationPostgresTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @Test
    @DisplayName("V5 moves the settings rent configuration into a lease and backfills receipts")
    void migratesSettingsIntoRentConfiguration() throws Exception {
        migrateTo("4");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO settings (id, company_name, home_address, landlord_name, landlord_address,
                        tenant_name, tenant_address, rent_excl_charges, charges_advance, updated_at)
                    VALUES (1, 'HKOF', '12 rue des Lilas, 75011 Paris', 'Bailleur historique',
                        '1 avenue du Parc, 75011 Paris', 'Locataire historique',
                        '12 rue des Lilas, 75011 Paris', 900.00, 50.00, NOW())
                    """);
            statement.execute("""
                    INSERT INTO rent_receipt (billing_month, period_start, period_end, rent_excl_charges,
                        charges, total, version, status, created_at)
                    VALUES ('2025-01', '2025-01-01', '2025-01-31', 900.00, 50.00, 950.00, 1, 'ARCHIVED', NOW())
                    """);
        }

        migrateTo("5");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(count(statement, """
                    SELECT COUNT(*) FROM information_schema.columns
                    WHERE table_name = 'settings' AND column_name IN (
                        'landlord_name', 'landlord_address', 'tenant_name', 'tenant_address',
                        'rent_excl_charges', 'charges_advance')
                    """)).isZero();

            long landlordId = singleLong(statement, "SELECT id FROM landlord WHERE deleted = FALSE");
            long tenantId = singleLong(statement, "SELECT id FROM tenant WHERE deleted = FALSE");
            long leaseId = singleLong(statement, "SELECT id FROM lease WHERE deleted = FALSE");

            assertThat(singleString(statement, "SELECT name FROM landlord WHERE id = " + landlordId))
                    .isEqualTo("Bailleur historique");
            assertThat(singleString(statement, "SELECT address FROM tenant WHERE id = " + tenantId))
                    .isEqualTo("12 rue des Lilas, 75011 Paris");
            assertThat(singleString(statement, "SELECT property_address FROM lease WHERE id = " + leaseId))
                    .isEqualTo("12 rue des Lilas, 75011 Paris");
            assertThat(singleDecimal(statement, "SELECT rent_excl_charges FROM lease WHERE id = " + leaseId))
                    .isEqualByComparingTo(new BigDecimal("900.00"));
            assertThat(singleDecimal(statement, "SELECT charges FROM lease WHERE id = " + leaseId))
                    .isEqualByComparingTo(new BigDecimal("50.00"));

            assertThat(singleLong(statement, "SELECT landlord_id FROM rent_receipt")).isEqualTo(landlordId);
            assertThat(singleLong(statement, "SELECT tenant_id FROM rent_receipt")).isEqualTo(tenantId);

            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO lease (landlord_id, tenant_id, property_address, rent_excl_charges, charges,
                        deleted, created_at)
                    VALUES (%d, %d, '12 rue des Lilas, 75011 Paris', 1000.00, 0.00, FALSE, NOW())
                    """.formatted(landlordId, tenantId)))
                    .isInstanceOf(SQLException.class);

            statement.execute("UPDATE lease SET deleted = TRUE WHERE id = " + leaseId);
            statement.execute("""
                    INSERT INTO lease (landlord_id, tenant_id, property_address, rent_excl_charges, charges,
                        deleted, created_at)
                    VALUES (%d, %d, '12 rue des Lilas, 75011 Paris', 1000.00, 0.00, FALSE, NOW())
                    """.formatted(landlordId, tenantId));
            assertThat(count(statement, "SELECT COUNT(*) FROM lease WHERE deleted = FALSE")).isEqualTo(1);
        }
    }

    private Connection connection() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
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

    private BigDecimal singleDecimal(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getBigDecimal(1);
        }
    }
}
