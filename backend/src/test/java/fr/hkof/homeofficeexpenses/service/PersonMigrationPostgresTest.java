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
 * Verifies {@code V10__person_lmnp.sql} on a real PostgreSQL instance: landlord, tenant and
 * employee identifiers overlap before the migration, so leases, receipts and signatures must
 * be remapped onto the merged person rows, enterprise leases must move their tenant to the
 * company, and legacy unlinked landlord signatures must follow the uniqueness rule.
 */
@Testcontainers(disabledWithoutDocker = true)
class PersonMigrationPostgresTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @Test
    @DisplayName("V10 remaps normal lease, receipt and signatures onto person rows")
    void remapsNormalLeaseAndReceipts() throws Exception {
        resetSchema();
        migrateTo("9");
        long landlordId;
        long tenantId;
        long employeeId;
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO landlord (name, address, deleted, created_at)
                    VALUES ('Bailleur Test', '1 rue Bailleur', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO tenant (name, address, deleted, created_at)
                    VALUES ('Locataire Test', '2 rue Locataire', FALSE, NOW())
                    """);
            landlordId = singleLong(statement, "SELECT id FROM landlord");
            tenantId = singleLong(statement, "SELECT id FROM tenant");
            employeeId = singleLong(statement, "SELECT id FROM employee WHERE company_id = 1");
            statement.execute(addressInsert("10 rue du Bien"));
            long addressId = singleLong(statement, "SELECT MAX(id) FROM address");
            statement.execute("""
                    INSERT INTO lease (landlord_id, tenant_id, address_id, rent_excl_charges, charges,
                        company_lease, deleted, created_at)
                    VALUES (%d, %d, %d, 900.00, 50.00, FALSE, FALSE, NOW())
                    """.formatted(landlordId, tenantId, addressId));
            statement.execute(receiptInsert("2026-01", landlordId, tenantId, 1, false));
            statement.execute("""
                    INSERT INTO signature (type, name, mime_type, image, deleted, created_at, landlord_id)
                    VALUES ('LANDLORD', 'Signature bailleur', 'image/png', '\\x89504e47'::bytea, FALSE, NOW(), %d)
                    """.formatted(landlordId));
            statement.execute("""
                    INSERT INTO signature (type, name, mime_type, image, deleted, created_at, company_id, employee_id)
                    VALUES ('EMPLOYEE', 'Signature salarie', 'image/png', '\\x89504e47'::bytea, FALSE, NOW(), 1, %d)
                    """.formatted(employeeId));
        }

        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(singleString(statement, """
                    SELECT p.name FROM lease l JOIN person p ON p.id = l.landlord_id
                    """)).isEqualTo("Bailleur Test");
            assertThat(singleString(statement, """
                    SELECT p.name FROM lease l JOIN person p ON p.id = l.tenant_id
                    """)).isEqualTo("Locataire Test");
            assertThat(singleLong(statement, "SELECT landlord_id FROM lease")).isEqualTo(landlordId);
            assertThat(singleLong(statement, "SELECT tenant_id FROM lease")).isNotEqualTo(landlordId);
            assertThat(singleLong(statement, "SELECT tenant_company_id FROM rent_receipt")).isZero();
            assertThat(singleString(statement, """
                    SELECT p.name FROM rent_receipt r JOIN person p ON p.id = r.tenant_id
                    """)).isEqualTo("Locataire Test");
            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM signature WHERE person_id IS NOT NULL AND deleted = FALSE")).isEqualTo(2);
            assertThat(singleLong(statement, """
                    SELECT COUNT(*) FROM signature s JOIN person p ON p.id = s.person_id
                    WHERE p.name = 'Bailleur Test'
                    """)).isEqualTo(1);
            assertThat(count(statement, """
                    SELECT COUNT(*) FROM information_schema.columns
                    WHERE table_name = 'signature' AND column_name IN ('type', 'landlord_id', 'employee_id')
                    """)).isZero();
            assertThat(count(statement, """
                    SELECT COUNT(*) FROM information_schema.tables
                    WHERE table_name IN ('landlord', 'tenant', 'employee')
                    """)).isZero();
        }
    }

    @Test
    @DisplayName("V10 converts an enterprise lease receipt to the tenant company")
    void convertsEnterpriseLease() throws Exception {
        resetSchema();
        migrateTo("9");
        long landlordId;
        long tenantId;
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO landlord (name, deleted, created_at) VALUES ('Bailleur Société', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO tenant (name, deleted, created_at) VALUES ('Locataire Société', FALSE, NOW())
                    """);
            landlordId = singleLong(statement, "SELECT id FROM landlord");
            tenantId = singleLong(statement, "SELECT id FROM tenant");
            statement.execute(addressInsert("20 rue Société"));
            long addressId = singleLong(statement, "SELECT MAX(id) FROM address");
            statement.execute("""
                    INSERT INTO lease (landlord_id, tenant_id, address_id, rent_excl_charges, charges,
                        company_id, company_lease, total_area, business_area, deleted, created_at)
                    VALUES (%d, %d, %d, 900.00, 0.00, 1, TRUE, 70.00, 25.00, FALSE, NOW())
                    """.formatted(landlordId, tenantId, addressId));
            statement.execute(receiptInsert("2026-02", landlordId, tenantId, 1, true));
        }

        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(singleLong(statement, "SELECT tenant_id FROM lease")).isZero();
            assertThat(singleLong(statement, "SELECT company_id FROM lease")).isEqualTo(1);
            assertThat(singleLong(statement, "SELECT tenant_id FROM rent_receipt")).isZero();
            assertThat(singleLong(statement, "SELECT tenant_company_id FROM rent_receipt")).isEqualTo(1);
            assertThat(singleString(statement, """
                    SELECT p.name FROM rent_receipt r JOIN person p ON p.id = r.landlord_id
                    """)).isEqualTo("Bailleur Société");

            statement.execute("""
                    INSERT INTO rent_receipt (billing_month, landlord_id, tenant_company_id, period_start,
                        period_end, rent_excl_charges, charges, total, version, status, created_at)
                    VALUES ('2026-02', %d, 1, '2026-02-01', '2026-02-28', 900.00, 0.00, 900.00, 2, 'ACTIVE', NOW())
                    """.formatted(landlordId));
            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO rent_receipt (billing_month, landlord_id, tenant_company_id, period_start,
                        period_end, rent_excl_charges, charges, total, version, status, created_at)
                    VALUES ('2026-02', %d, 1, '2026-02-01', '2026-02-28', 900.00, 0.00, 900.00, 2, 'ACTIVE', NOW())
                    """.formatted(landlordId)))
                    .isInstanceOf(SQLException.class);
        }
    }

    @Test
    @DisplayName("V10 links a legacy unlinked landlord signature when one natural person exists")
    void linksLegacySignatureWhenUnique() throws Exception {
        resetSchema();
        migrateTo("9");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO landlord (name, deleted, created_at) VALUES ('Bailleur Unique', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO signature (type, name, mime_type, image, deleted, created_at)
                    VALUES ('LANDLORD', 'Signature orpheline', 'image/png', '\\x89504e47'::bytea, FALSE, NOW())
                    """);
        }

        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM signature WHERE person_id IS NOT NULL AND deleted = FALSE"))
                    .isEqualTo(1);
            assertThat(singleString(statement, """
                    SELECT p.name FROM signature s JOIN person p ON p.id = s.person_id
                    """)).isEqualTo("Bailleur Unique");
        }
    }

    @Test
    @DisplayName("V10 logically deletes an ambiguous legacy landlord signature")
    void deletesLegacySignatureWhenAmbiguous() throws Exception {
        resetSchema();
        migrateTo("9");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO landlord (name, deleted, created_at) VALUES
                        ('Bailleur A', FALSE, NOW()),
                        ('Bailleur B', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO signature (type, name, mime_type, image, deleted, created_at)
                    VALUES ('LANDLORD', 'Signature orpheline', 'image/png', '\\x89504e47'::bytea, FALSE, NOW())
                    """);
        }

        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM signature WHERE person_id IS NULL AND deleted = TRUE")).isEqualTo(1);
            assertThat(count(statement, "SELECT COUNT(*) FROM signature")).isEqualTo(1);
        }
    }

    private String addressInsert(String label) {
        return "INSERT INTO address (label, deleted, created_at) VALUES ('%s', FALSE, NOW())".formatted(label);
    }

    private String receiptInsert(String month, long landlordId, long tenantId, int version, boolean company) {
        return """
                INSERT INTO rent_receipt (billing_month, landlord_id, tenant_id, company_id, period_start,
                    period_end, rent_excl_charges, charges, total, version, status, created_at)
                VALUES ('%s', %d, %d, 1, '%s-01', '%s-28', 900.00, 50.00, 950.00, %d, 'ACTIVE', NOW())
                """.formatted(month, landlordId, tenantId, month, month, version);
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

    private Flyway flyway() {
        return Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .load();
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
