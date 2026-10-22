---
name: Backend delivery
description: Use when implementing or fixing a backend feature in HomeOfficeExpenses - entity, Flyway migration, CalculationService rule, repository, service, REST controller or DTO. Enforces TDD, BigDecimal-only money and the API contract.
---

# Backend delivery

## Before writing code

1. Read the relevant part of `product_prompt.md` and `openapi/openapi.yaml`.
2. Check whether the contract must change. If yes, load the `openapi-contract` skill first.
3. Write the failing test. Run it and read the failure.
4. Only then implement.

## Money rules

- Use `BigDecimal` with scale 2 and `RoundingMode.HALF_UP`. Never `double` or `float`.
- Put every calculation in `CalculationService` (`service/CalculationService.java`).
  It is pure: no Spring, no repository, no clock.
- Existing operations: `allocateToMonth`, `claimedAmount`, `total`, `proRataBase`,
  `totalRentReceipt`. Add a new pure method rather than duplicating logic.
- Allocation over a month: `amount × (days of the period inside the month / total days of the period)`.
- Retained amount per line: `monthly amount × pro-rata %`, rounded to the cent.
- Total: sum of the rounded retained amounts.
- API amounts are decimal strings or integer cents, never JSON floats.
- A controller never computes a total; it calls the service.

## Persistence

- Entities live in `domain/`, repositories in `repository/`.
- Logical deletion: `deleted` flag, queries use `findByDeletedFalse...`.
- One active version per month and per document type; regeneration creates a new version
  and keeps the previous one.
- One active template per type.
- Month stored as `YYYY-MM`; business dates as `LocalDate`; timestamps as `Instant`.
- Flyway: new file `V<n>__description.sql` in
  `backend/src/main/resources/db/migration/`. Never edit an applied migration.
- Add the unique constraints the rule requires (month + version, item code,
  type + active template).

## Web layer

- Controllers in `web/`; DTO records in `web/dto/Dtos.java`.
- `@Transactional(readOnly = true)` on read-only service methods.
- `BusinessException` for business rule violations, `NotFoundException` for missing rows.
- Errors become `ProblemDetail` with a French message for the user.
- Validation at the boundary; no business logic in the controller.
- English identifiers and comments; French messages.

## Tests

- JUnit 5 + AssertJ.
- Money cases: 28/29/30/31-day months, leap years, bimonthly and annual invoices,
  pro-rata bounds 0 and 100, rejected negative amounts, rounding at `.005`.
- Number to words: 0, 1, 21, 71, 80, 81, 100, 1 000, 1 234.56 and cents.
- Integration tests through MockMvc or the existing `ApiIntegrationTest` pattern.
- LLM-related tests use WireMock or `mock-ollama`, never a real Ollama.

## Definition of done

```bash
cd backend && ./mvnw -B test
```

Report the actual result. A feature without tests, or with a failing test, is not done.
