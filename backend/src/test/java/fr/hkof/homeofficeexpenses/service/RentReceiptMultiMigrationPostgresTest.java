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
 * Verifies {@code V6__signature_landlord_multi_receipts.sql} on a real PostgreSQL instance:
 * the signature backfill only happens when exactly one non-deleted landlord exists, the
 * one-active-receipt restriction is removed and the per-pair version uniqueness is enforced.
 * H2 runs with Flyway disabled and does not enforce partial unique indexes, so this test needs
 * a container.
 */
@Testcontainers(disabledWithoutDocker = true)
class RentReceiptMultiMigrationPostgresTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @Test
    @DisplayName("V6 links LANDLORD signatures to the only non deleted landlord")
    void backfillsSignatureLandlordWhenUnique() throws Exception {
        resetSchema();
        migrateTo("5");
        long landlordId;
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO landlord (name, deleted, created_at)
                    VALUES ('Bailleur unique', FALSE, NOW())
                    """);
            landlordId = singleLong(statement, "SELECT id FROM landlord");
            statement.execute("""
                    INSERT INTO signature (type, name, mime_type, image, deleted, created_at)
                    VALUES ('LANDLORD', 'Signature bailleur', 'image/png', '\\x89504e47'::bytea, FALSE, NOW()),
                           ('ENTREPRISE_CEO', 'Signature gérant', 'image/png', '\\x89504e47'::bytea, FALSE, NOW())
                    """);
        }

        migrateTo("6");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(singleLong(statement,
                    "SELECT landlord_id FROM signature WHERE type = 'LANDLORD'")).isEqualTo(landlordId);
            assertThat(count(statement,
                    "SELECT COUNT(*) FROM signature WHERE type = 'ENTREPRISE_CEO' AND landlord_id IS NULL"))
                    .isEqualTo(1);
        }
    }

    @Test
    @DisplayName("V6 leaves LANDLORD signatures unlinked when several landlords exist")
    void keepsSignatureUnlinkedWhenAmbiguous() throws Exception {
        resetSchema();
        migrateTo("5");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO landlord (name, deleted, created_at) VALUES
                        ('Bailleur A', FALSE, NOW()),
                        ('Bailleur B', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO signature (type, name, mime_type, image, deleted, created_at)
                    VALUES ('LANDLORD', 'Signature bailleur', 'image/png', '\\x89504e47'::bytea, FALSE, NOW())
                    """);
        }

        migrateTo("6");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(count(statement, "SELECT COUNT(*) FROM signature WHERE landlord_id IS NULL"))
                    .isEqualTo(1);
        }
    }

    @Test
    @DisplayName("V6 allows several active receipts and versions per landlord and tenant pair")
    void replacesReceiptConstraints() throws Exception {
        resetSchema();
        migrateTo("5");
        long firstLandlord;
        long firstTenant;
        long secondLandlord;
        long secondTenant;
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO landlord (name, deleted, created_at) VALUES
                        ('Bailleur 1', FALSE, NOW()),
                        ('Bailleur 2', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO tenant (name, deleted, created_at) VALUES
                        ('Locataire 1', FALSE, NOW()),
                        ('Locataire 2', FALSE, NOW())
                    """);
            firstLandlord = singleLong(statement, "SELECT MIN(id) FROM landlord");
            secondLandlord = singleLong(statement, "SELECT MAX(id) FROM landlord");
            firstTenant = singleLong(statement, "SELECT MIN(id) FROM tenant");
            secondTenant = singleLong(statement, "SELECT MAX(id) FROM tenant");
            statement.execute(receiptInsert("2026-01", firstLandlord, firstTenant, 1, "ACTIVE"));
        }

        migrateTo("6");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            // The old (billing_month, version) constraint and the one-active index are gone.
            statement.execute(receiptInsert("2026-01", secondLandlord, secondTenant, 1, "ACTIVE"));
            statement.execute(receiptInsert("2026-01", firstLandlord, firstTenant, 2, "ACTIVE"));
            assertThat(count(statement, "SELECT COUNT(*) FROM rent_receipt WHERE status = 'ACTIVE'"))
                    .isEqualTo(3);

            assertThatThrownBy(() -> statement.execute(
                    receiptInsert("2026-01", firstLandlord, firstTenant, 2, "ACTIVE")))
                    .isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> statement.execute(
                    receiptInsert("2026-01", firstLandlord, firstTenant, 1, "ARCHIVED")))
                    .isInstanceOf(SQLException.class);

            statement.execute(receiptInsert("2026-01", firstLandlord, firstTenant, 3, "ARCHIVED"));
            statement.execute(receiptInsert("2026-02", firstLandlord, firstTenant, 1, "ACTIVE"));
            assertThat(count(statement, "SELECT COUNT(*) FROM rent_receipt")).isEqualTo(5);
        }
    }

    private String receiptInsert(String month, long landlordId, long tenantId, int version, String status) {
        return """
                INSERT INTO rent_receipt (billing_month, landlord_id, tenant_id, period_start, period_end,
                    rent_excl_charges, charges, total, version, status, created_at)
                VALUES ('%s', %d, %d, '%s-01', '%s-28', 900.00, 50.00, 950.00, %d, '%s', NOW())
                """.formatted(month, landlordId, tenantId, month, month, version, status);
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
}
