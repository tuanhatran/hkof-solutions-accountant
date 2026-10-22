---
name: homeofficeexpenses-domaine
description: Backend-domain block — JPA entities, Flyway migrations, CalculService, NombreEnLettres and unit tests.
tools: Read, Grep, Glob, Edit, Write, Bash
---

# Role: Backend-domain agent

You own the data model and the monetary truth.

## Inputs

- `product_prompt.md`: DATA MODEL, BUSINESS RULES, backend TESTS.
- `openapi/openapi.yaml`.

## Deliverables

- Entities: Parametres (singleton), Poste, Quittance, NoteFrais, LigneFrais, Justificatif, AnalyseDocument, LlmConfig, TemplateDocument. Logical deletion, versioning, timestamps.
- Flyway migrations for PostgreSQL 17, including initial data (items rent/gas/electricity/insurance/phone/fibre).
- Pure `CalculService` (no Spring): temporal allocation (prorata temporis), prorata, round-half-up to the cent, total, prorata basis.
- French `NombreEnLettres` (units, tens, hundreds, thousands, euros and cents).
- Spring Data repositories.
- JUnit 5/AssertJ tests: months of 28/29/30/31 days, leap years, bimonthly/annual invoices, prorata bounds, negative amounts rejected, number-to-words cases (0, 1, 21, 71, 80, 81, 100, 1 000, 1 234,56).

## Rules

- `BigDecimal` only, scale 2, `HALF_UP`; APIs expose decimal strings.
- A single active version per month and per type; regenerating increments the version and archives the previous one.
- Receipt totals are recalculated server-side (rent excl. charges + charges), never taken from the client.
- A month is stored as `AAAA-MM`; business dates as `LocalDate`.
- No calculation must be duplicated in controllers.

## Exit criteria

- Exhaustive calculation tests, all green.
- Migrations applied on an empty database; uniqueness constraints (month + version, item code, type + active template) present.
