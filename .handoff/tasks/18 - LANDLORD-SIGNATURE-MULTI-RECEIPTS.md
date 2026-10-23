# LANDLORD-SIGNATURE-MULTI-RECEIPTS

Status: DONE · Branch: feat/landlord-signatures-per-pair-receipts · Size: L · Round: 1/2

## Goal

Link each LANDLORD signature to a landlord and allow unlimited ACTIVE rent receipts per month/pair (identical content allowed). Out of scope: expense-statement pair selection, LibreOffice/template upload, calculation, LLM, secrets, physical deletion.

## Files

Writable: `openapi/openapi.yaml`; `backend/src/main/resources/db/migration/V6__signature_landlord_multi_receipts.sql`; `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/Signature.java,repository/{Signature,RentReceipt}Repository.java,service/{SignatureService,RentReceiptService,E2eResetService}.java,web/{Signature,RentReceipt}Controller.java,web/dto/Dtos.java}`; `backend/src/test/java/fr/hkof/homeofficeexpenses/{service/{SignatureServiceTest,RentReceiptMultiMigrationPostgresTest}.java,web/{ApiIntegrationTest,E2eResetIntegrationTest,ExpenseStatementActiveIntegrationTest,SignatureControllerIntegrationTest}.java}`; `frontend/src/api/{endpoints,queries}.ts`; `frontend/src/components/SignaturesManager.tsx`; `frontend/src/pages/{GenerateRentReceiptPage,HistoryPage}.tsx`; their tests; `frontend/cypress/e2e/{00-settings,01-rent-receipt}.cy.ts`; `README.md`.
Affected tests (`codegraph affected`): `frontend/src/api/queries.test.ts`, `frontend/src/components/{SignaturesManager,RentReceiptSettings}.test.tsx`, `frontend/src/pages/{GenerateRentReceiptPage,GenerateExpenseStatementPage,SettingsPage}.test.tsx`; symbols/routes `SignatureService.create/resolve`, `RentReceiptService.generate/preview/activeForMonth`, `POST /api/signatures`, `POST /api/rent-receipts`, `GET /api/rent-receipts/active`, `GenerateRentReceiptPage`, `SignaturesManager`.

## Constraints

Contract (additive): `openapi/openapi.yaml#/paths/~1api~1signatures` POST multipart adds `landlordId`; `~1api~1rent-receipts~1active` adds optional `landlordId`,`tenantId`; `SignatureDto` adds nullable `landlordId`,`landlordName`; YAML first, `npm run gen:api`, never hand-edit `schema.ts`.
Model: nullable `Signature.landlordId` FK; LANDLORD requires an existing non-deleted landlord, CEO rejects one; resolution explicit (linked or legacy unlinked) → first linked → first legacy unlinked, otherwise the French "Aucune signature configurée…" error; V6 backfills only when exactly one landlord exists. V6 replaces monthly uniqueness with unique `(billing_month, landlord_id, tenant_id, version)`, never archives on generation, unlimited ACTIVE; `/active` deterministic pair-first. French UI · `CalculationService` only · no `any` · no commit/push/reset/clean/stash.

## Acceptance

Landlord-linked signature end to end, another landlord's signature rejected; V6 proven on real PostgreSQL; several ACTIVE receipts per month/pair; backend + Vitest + full E2E green first attempt, every spec/test, no retry; real counts and contract impact recorded.

## Commands

`cd backend && ./mvnw -B test` · `./mvnw -B -Dtest='*PostgresTest' -Dapi.version=1.44 test` · `cd frontend && npm run gen:api && npm run typecheck && npm test && npm run build` · `codegraph sync` · e2e `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`, then `down -v --remove-orphans`.

## Evidence

- 2026-10-23 lead: branch `feat/landlord-signatures-per-pair-receipts` created from `feat/settings-landlords-tenants` (clean); Size L — contract, migration, signature path, >10 files → builder then reviewer (max 2 rounds). User chose unlimited ACTIVE receipts.
- 2026-10-23 builder: 30 files changed (contract, V6, signature+receipt paths, frontend, 2 E2E specs, README). Contract: POST /api/signatures multipart `landlordId`; GET /api/rent-receipts/active optional `landlordId`/`tenantId`; SignatureDto `landlordId`/`landlordName` nullable (nullable added, additive); schema.ts regenerated, never hand-edited.
- RED: 4 new GenerateRentReceiptPage tests + 4 updated SignaturesManager tests → 8 failed / 9 passed; GREEN 17/17 after implementation.
- PASS `cd backend && ./mvnw -B test` → 138 tests, 0 failures, 0 errors, 6 skipped (5 Docker-gated Postgres tests without `-Dapi.version`, 1 pre-existing PDF fixture assumption).
- PASS `cd backend && ./mvnw -B -Dtest='*PostgresTest' -Dapi.version=1.44 test` → 5 tests, 0 failures, 0 skipped (RentReceiptMultiMigrationPostgresTest 3/3).
- PASS `cd frontend && npm run gen:api && npm run typecheck && npm test && npm run build` → typecheck clean, 14 files / 91 tests, build OK.
- PASS `codegraph affected` → 11 expected files; `codegraph sync` → 27 files indexed.
- PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` → cypress exit 0, 5 specs / 24 tests, 24 passed, 0 failed, 0 skipped, 0 retries; `down -v --remove-orphans` OK.
- Deviations: added `frontend/cypress/fixtures/signature-e2e.png` (synthetic 1x1 PNG) outside the writable list; parallel subagents unavailable → blocks run serially.
- Risk: expense statements still use the month-scoped `/api/rent-receipts/active` (pair selection out of scope); legacy unlinked LANDLORD signatures remain accepted as fallback.
- 2026-10-23 builder follow-up: gated the month-scoped active receipt on `GenerateRentReceiptPage` (panel + `activeVersion`/`displayedTotal` + bottom hint on both selected ids, panel also on `selectedLease`); hint now "Dernière version : vN → vN+1 à la génération.". Files: `frontend/src/pages/GenerateRentReceiptPage.tsx`, `frontend/src/pages/GenerateRentReceiptPage.test.tsx`. Contract: none.
- RED→GREEN: 2 new tests (activeReceipt with no pair/lease → no panel, no hint; pair selected → panel + total/version 2) → 2 failed / 11 passed, then 13/13.
- PASS `cd frontend && npm run typecheck && npm test && npm run build` → exit 0, typecheck clean, 14 files / 93 tests passed, build OK.
- PASS `codegraph affected` → GenerateRentReceiptPage.test.tsx + GenerateExpenseStatementPage.test.tsx; `codegraph sync` → 3 modified / 64 nodes.
- PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` → exit 0, 5 specs / 24 tests, 24 passed, 0 failed, 0 skipped, 0 retries (no attempt-2 marker in the log); `down -v --remove-orphans` exit 0.
- Deviations: none. Status REVIEW, Round 0/2 unchanged.
- 2026-10-23 reviewer: PASS (round 1) — read the full 27-file tracked diff plus both untracked files; migration, contract change and new/updated tests checked against pre-fix behaviour and the gate/E2E evidence; no blocker. Status → USER_REVIEW.
- 2026-10-23 lead: DONE — user accepted.
