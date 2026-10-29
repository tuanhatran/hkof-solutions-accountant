# SETTINGS-LANDLORDS-TENANTS

Status: DONE · Branch: feat/settings-landlords-tenants · Size: L · Round: 1/2

## Goal

Split `/configuration` into « Entreprise » and « Quittances » tabs; add landlord, tenant and lease directories (lease = landlord + tenant + property address + rent HC + charges) and make rent-receipt generation select one landlord and one tenant, prefilled from their active lease. Out of scope: calculation rules, expense statements, templates, LLM, security, deleting existing receipts, per-pair monthly receipts.

## Files

Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/{Settings,RentReceipt}.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/service/{SettingsService,RentReceiptService,E2eResetService}.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/service/template/TemplateDataService.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/config/DataInitializer.java`, `backend/src/main/resources/db/migration/V1__init.sql`, `frontend/src/pages/{SettingsPage,GenerateRentReceiptPage}.tsx`, `frontend/src/state/rentReceiptDraft.ts`, `frontend/src/lib/validation.ts`, `frontend/src/api/{endpoints,queries,types}.ts`, `frontend/cypress/support/helpers.ts`, `product_prompt.md`.
Writable: `openapi/openapi.yaml`; new `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/{Landlord,Tenant,Lease}.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/repository/{Landlord,Tenant,Lease}Repository.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/service/RentConfigurationService.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/web/RentConfigurationController.java`; edit `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/{Settings,RentReceipt}.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/web/dto/Dtos.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/service/{SettingsService,RentReceiptService,E2eResetService}.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/service/template/TemplateDataService.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/config/DataInitializer.java`, new `backend/src/main/resources/db/migration/V5__rent_receipt_configuration.sql`, backend tests `backend/src/test/java/fr/hkof/homeofficeexpenses/web/{ApiIntegrationTest,E2eResetIntegrationTest}.java` (+ new `RentConfigurationMigrationPostgresTest.java`); `frontend/src/pages/{SettingsPage,GenerateRentReceiptPage}.tsx`, new `frontend/src/components/{RentReceiptSettings.tsx,RentReceiptSettings.test.tsx}`, `frontend/src/api/{endpoints,queries,types}.ts` + generated `frontend/src/api/schema.ts`, `frontend/src/lib/validation.ts`, `frontend/src/state/rentReceiptDraft.ts`, `frontend/src/pages/GenerateRentReceiptPage.test.tsx`, `frontend/src/lib/validation.test.ts`, `frontend/src/api/queries.test.ts`, `frontend/src/pages/GenerateExpenseStatementPage.test.tsx` (mock shape only), `frontend/cypress/e2e/{00-settings,01-rent-receipt}.cy.ts`, `frontend/cypress/support/helpers.ts`, `README.md` (Assumptions).
Affected tests (`codegraph affected`): `backend/src/test/java/fr/hkof/homeofficeexpenses/web/{ApiIntegrationTest,E2eResetIntegrationTest,ExpenseStatementActiveIntegrationTest,SignatureControllerIntegrationTest}.java`; `frontend/src/api/queries.test.ts`, `frontend/src/lib/validation.test.ts`, `frontend/src/pages/{GenerateRentReceiptPage,GenerateExpenseStatementPage}.test.tsx`, `frontend/src/components/SignaturesManager.test.tsx`; E2E `frontend/cypress/e2e/{00-settings,01-rent-receipt}.cy.ts`.

## Constraints

Contract: **breaking** — `openapi/openapi.yaml#/components/schemas/SettingsRequest` and `SettingsDto` lose `landlordName`,`landlordAddress`,`tenantName`,`tenantAddress`,`rentExclCharges`,`chargesAdvance`; new CRUD `#/paths/~1api~1landlords`, `~1api~1tenants`, `~1api~1leases` (GET/POST, PUT/DELETE `{id}`, 204 delete, `ProblemDetail` French errors); `RentReceiptRequest` gains required `landlordId`,`tenantId`; `RentReceiptDto` gains `landlordId`,`tenantId`,`landlordName`,`tenantName`. YAML first, then `npm run gen:api`; never hand-edit `schema.ts`.
Model: one active lease per landlord+tenant pair (partial unique index where not deleted); generating/previewing resolves that lease; blank amount fields fall back to lease rent HC/charges, explicit values override; missing pair/lease → French `BusinessException`; logical deletion only; deleting a landlord/tenant/lease referenced by an active lease is refused in French. Preserve the existing global rule: **one active receipt per month and global month versioning**; record the selected pair on the receipt but do not split monthly uniqueness (per-pair receipts = later task).
Migration: `V5` creates `landlord`, `tenant`, `lease`; copies the current settings landlord/tenant/home/rent/charges into one row each; adds nullable `landlord_id`/`tenant_id` to `rent_receipt` and backfills existing rows; then drops the six moved settings columns. `DataInitializer` seeds the same defaults on a fresh DB; `E2eResetService` deletes leases, tenants and landlords before settings and replays the initializer.
UI: tabs « Entreprise » (société, logement/quote-part, types de frais) and « Quittances » (bailleurs, locataires, baux); keep `SignaturesManager` available. Generate page: required `select-bailleur`/`select-locataire`, preselect the only active lease, prefill amounts/property, show a French message when the pair has no lease; PDF renders the selected landlord, tenant and lease property address, not settings.
Money/quality: lease amounts only feed `CalculationService.totalRentReceipt`; no new arithmetic · UI French · no `any` · no commit/push/reset/clean/stash · tests ship with the change.

## Acceptance

- [x] Contract YAML first + `npm run gen:api`; settings no longer expose moved fields; landlord/tenant/lease CRUD works, logical deletion and French refusals included.
- [x] V5 migrates an existing `settings` row into one landlord/tenant/lease, backfills existing receipts, drops the moved columns; fresh DB and `POST /api/e2e/reset` seed one of each; old PDFs untouched.
- [x] Configuration has the two tabs and CRUD for the three lists; generation selects bailleur+locataire, prefills lease amounts/property, produces a PDF with the selected names/address, and keeps versioning/regeneration.
- [x] Backend integration + Postgres migration test + Vitest (tabs/CRUD/selection/prefill) + updated E2E specs; full E2E first attempt green, every spec/test, no retry; record real counts and contract impact.

## Commands

- backend: `cd backend && ./mvnw -B test` · frontend: `cd frontend && npm run gen:api && npm run typecheck && npm test && npm run build` · `codegraph sync`.
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` (then `down -v --remove-orphans`).

## Evidence

- 2026-10-23 lead: branch `feat/settings-landlords-tenants` created from `main` (clean); Size L — contract, migration, money path, >10 files → builder then reviewer (max 2 rounds).
- 2026-10-23 builder: finished E2E loop; only extra edit `frontend/cypress/e2e/00-settings.cy.ts:42` (raw `contain.text` → normalizing `waitForText`). Other files as listed in Files block, unchanged by this session.
- `cd backend && ./mvnw -B test` PASS — Tests 130, Failures 0, Errors 0, Skipped 3 (Testcontainers).
- `cd backend && ./mvnw -B -Dtest='*PostgresTest' -Dapi.version=1.44 test` PASS — 2 tests (V5 migration + template activation), 0 skipped.
- `cd frontend && npm run gen:api && npm run typecheck && npm test && npm run build` PASS — 14 files / 84 tests, typecheck 0 errors, build exit 0.
- E2E RED→GREEN `00-settings.cy.ts` "edits the seeded lease amounts…": RED timed out 12 s (raw narrow NBSP vs literal amount), fix → GREEN 4/4, no retry.
- E2E full: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` → EXIT 0; 5 specs / 23 tests, 0 failing, 0 retries; `down -v --remove-orphans` executed.
- `codegraph sync` PASS (index updated).
- Contract: breaking; `openapi/openapi.yaml#/paths/~1api~1landlords`, `~1api~1landlords~1{id}`, `~1api~1tenants`, `~1api~1tenants~1{id}`, `~1api~1leases`, `~1api~1leases~1{id}`; `#/components/schemas/SettingsRequest`+`SettingsDto` drop 6 moved fields; `RentReceiptRequest` adds required `landlordId`/`tenantId`; `RentReceiptDto` adds those 4 name/id fields. `schema.ts` regenerated only.
- Deviation/risk: Docker 29.8 rejects API 1.32 used by Testcontainers 1.21.3, so the 3 Testcontainers tests skip in the plain gate; they pass with `-Dapi.version=1.44`. Not caused by this task (same on main); CI needs the property or a newer Testcontainers.
- 2026-10-23 reviewer: `VERDICT: PASS` (round 1) — reviewed all 40 file diffs; contract and generated types consistent, V5 copy/backfill verified on PostgreSQL, pair resolution and blank-amount fallback route through `CalculationService` with French errors, logical deletion and partial unique index preserved, E2E 5 specs / 23 tests exit 0 with no retry.
- 2026-10-23 lead: reviewer PASS recorded; `Status: USER_REVIEW`; awaiting explicit user acceptance before `DONE`.
- 2026-10-23 lead: DONE — user accepted
