# FIX-E2E-SIGNATURE-SEED

Status: DONE · Branch: `fix/e2e-failures` · Size: M · Round: 1/2

## Goal

`make e2e` exits 0 with 21/21 tests, 5/5 specs: seed one deterministic LANDLORD and one ENTREPRISE_CEO signature in the e2e reset so the mandatory-signature gate stops causing 14 failures. Out of scope: production signature behaviour, calculation, contract, existing assertions.

## Files

Context: `SignatureService`, `SignatureRepository`, `Signature`, `SignatureType`, `DataInitializer`, `RentReceiptService.signatureDataUri`, `frontend/cypress/support/helpers.ts`, `frontend/cypress/e2e/*.cy.ts`
Writable: `backend/src/main/java/fr/hkof/homeofficeexpenses/service/E2eResetService.java`, `backend/src/test/java/fr/hkof/homeofficeexpenses/web/E2eResetIntegrationTest.java`
Affected: `backend/src/test/java/fr/hkof/homeofficeexpenses/web/E2eResetIntegrationTest.java`
Routes: `POST /api/e2e/reset`, `POST /api/rent-receipts`, `POST /api/expense-statements/preview`

## Constraints

Contract: none · no Flyway change · production behaviour untouched · synthetic valid PNG (the 1×1 constant in `SignatureControllerIntegrationTest` is fine, not `templates/Signature_Bailleur.png`) · `createdAt`/`deleted` set · UI French · no `any` · no commit or push

## Acceptance

- [ ] Reset deletes signatures then seeds exactly one LANDLORD + one ENTREPRISE_CEO; `E2eResetIntegrationTest` asserts both and fails without the seed
- [ ] Full Cypress run in one shot: 21/21 passing, 5/5 specs, no retry-only pass, no skipped or loosened assertion
- [ ] Backend `./mvnw -B test` and frontend typecheck/test/build pass

## Commands

- backend: `cd backend && ./mvnw -B test` · frontend: `cd frontend && npm run typecheck && npm test && npm run build`
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`, then `down -v --remove-orphans` (`make` absent)

## Evidence

- 2026-10-23 lead: baseline exit 2 — 7/21 passing, 14 failing; 13 × `POST /api/rent-receipts` 400 "Aucune signature configurée…", 1 × `cy.wait("@preview")` timeout (same cause)
- 2026-10-23 builder RED: new `E2eResetIntegrationTest.resetSeedsDefaultSignatures` → `$.length()` expected 2 got 1 (custom signature survived, none seeded)
- 2026-10-23 builder GREEN: same class 2/2 passing; files changed: `E2eResetService.java` (inject `SignatureRepository`, delete signatures in `reset()`, seed 1 LANDLORD + 1 ENTREPRISE_CEO synthetic 1×1 PNG), `E2eResetIntegrationTest.java`
- 2026-10-23 builder PASS `cd backend && ./mvnw -B test` exit 0 — 125 tests, 0 failures, 0 errors, 2 skipped
- 2026-10-23 builder PASS `cd frontend && npm run typecheck && npm test && npm run build` exit 0 — typecheck OK, 12 files / 69 tests, build OK
- 2026-10-23 builder PASS e2e `up --build … --exit-code-from cypress` exit 0 — 21/21 tests, 5/5 specs, 0 retries (00-settings 2, 01-rent-receipt 1, 02-expense-statement 12, 03-finalization 1, 04-admin-templates 5)
- 2026-10-23 builder PASS `down -v --remove-orphans` exit 0 · codegraph sync done · contract none, no migration, `DataInitializer` untouched · risk: none
- 2026-10-23 reviewer: PASS (round 1) — seeding satisfies `SignatureService.resolve`/`dataUri`, no inbound FK on `signature`, reset idempotent, no production/spec/contract impact
- 2026-10-23 lead: independent rerun `cd backend && ./mvnw -B test` exit 0 — 125 tests, 0 failures, 0 errors, 2 skipped
- 2026-10-23 lead: USER_REVIEW — awaiting user acceptance
- 2026-10-23 lead: DONE — user accepted
