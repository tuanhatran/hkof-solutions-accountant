# Backend conventions

## Stack and layout

- Java 25, Spring Boot 4.1.x, Maven, PostgreSQL 17, Flyway.
- Package `fr.hkof.homeofficeexpenses`:
  - `config/`: Spring configuration, properties, security, clients.
  - `domain/`: entities and business objects.
  - `repository/`: Spring Data.
  - `service/`: business logic, transactions, calculations.
  - `web/`: REST controllers; DTO records in `web/dto/Dtos.java`.
- Spring Boot 4 / Spring Framework 7: check the migration notes; do not assume a Boot 3
  configuration still applies.

## Code rules

- `CalculationService` is a pure class with no Spring dependency and full unit-test coverage.
- Never duplicate a calculation in a controller or a repository.
- Read methods use `@Transactional(readOnly = true)`.
- Errors: `BusinessException` for a business rule, `NotFoundException` for a missing entity.
  Both produce a `ProblemDetail` with a French user-facing message.
- Logically deleted entities carry a `deleted` flag; every query filters on it
  (`findByDeletedFalse...`).
- Timestamps: `Instant` in the database, `LocalDate` for business dates, display in
  `Europe/Paris`.
- Month stored as `YYYY-MM`. Regeneration increments the version and archives the previous one.

## Flyway

- Migrations live in `backend/src/main/resources/db/migration/`.
- Never edit an applied migration: add `V<n>__description.sql`.
- Expected unique constraints: month + version, item code, type + active template.
- Initial data: rent, gas, electricity, insurance, phone, fibre items.

## Code language

- Identifiers, comments and Javadoc in English.
- User-facing messages and API error messages in French.
- Domain terms from the specification keep their original names in the database and the
  contract (see `00-absolute-rules.md`).

## Tests

- JUnit 5 + AssertJ.
- Mandatory calculation cases: 28/29/30/31-day months, leap years, bimonthly and annual
  invoices, pro-rata bounds, rejected negative amounts.
- Number to words: 0, 1, 21, 71, 80, 81, 100, 1 000, 1 234.56.
- LLM tests use WireMock or `mock-ollama`, never a real Ollama instance.

## Verification

```bash
cd backend && ./mvnw -B test
```
