# 95 - E2E-ONBOARDING-AGENCY-AND-DASHBOARD

Status: DONE
Branch: feat/95-e2e-onboarding-agency-and-dashboard
Base: a66fd1a
Size: M
Round: 0/2

## Goal

Update Cypress E2E coverage in `07-onboarding.cy.ts` to validate the complete new onboarding workflow: registration with agency module selection, Step 1 agency profile with phone country code and address autocomplete, Step 2 properties with separate landlord details, Step 3 lease with property selection and individual/colocation amounts, landing on the Agency Dashboard with metrics, and verifying rent receipt generation. Out of scope: production feature changes (tasks 91-94).

## Files

Context (read only): `frontend/cypress/e2e/{00-settings.cy.ts,01-rent-receipt.cy.ts,06-auth.cy.ts}`, `frontend/cypress/support/{e2e.ts,helpers.ts}`.
Writable frontend: `frontend/cypress/e2e/07-onboarding.cy.ts`, `frontend/cypress/support/{e2e.ts,helpers.ts}`, `frontend/src/pages/onboarding/*.tsx` (`data-cy` attributes only), `frontend/src/pages/dashboard/*.tsx` (`data-cy` attributes only).
Writable handoff: `.handoff/data-cy-mapping.md` (record every new hook).
Touched E2E: `07-onboarding`

## Constraints

Cypress only; no production business logic change · seeded accounts stay onboarding-complete; test registers a unique fresh account via `/inscription` · select "Agence immobilière" module during registration · explicit `data-cy` hooks only, recorded in `.handoff/data-cy-mapping.md` · no hardcoded sleeps; rely on Cypress retryability · pointer events for canvas signature drawing · assert redirect to `/tableau-de-bord` after finalize · assert Dashboard renders agency name, property count, and lease count · navigate to receipt generator and verify PDF download via `readPdf` · leave the stack running until user acceptance · builder commits once (including mapping file, never task handoff), nobody pushes.

## Acceptance

- [x] Registration selects the "Agence immobilière" module and lands on `/bienvenue`.
- [x] Step 1 fills manager phone with country code, fills address, agency name, and draws a signature.
- [x] Step 2 fills property address and distinct landlord details.
- [x] Step 3 selects the property and configures the lease with individual or colocation amounts.
- [x] Finalize lands on `/tableau-de-bord`; Dashboard displays agency name and portfolio counts.
- [x] Navigating to rent receipt generator generates a receipt with the configured property and tenants.
- [x] `make e2e 07-onboarding` passes with 0 failures; `.handoff/data-cy-mapping.md` lists every new hook.

## Commands

`cd frontend && npm run lint && npm run format:check && npm run build` · `make e2e-up` once, then `make e2e 07-onboarding` · `make e2e-down` only after user acceptance.

## Evidence

- E2E RED: `make e2e 07-onboarding` -> FAIL (exit code 2; `[data-cy="input-onboarding-property-address"]` not found on old flow)
- E2E GREEN: `make e2e 07-onboarding` -> PASS (exit code 0; 1 spec, 1 passed, 0 failed in 9s)
- Lint: `cd frontend && npm run lint` -> PASS (0 errors, 0 warnings)
- Format check: `cd frontend && npm run format:check` -> PASS (All matched files use Prettier code style)
- Build: `cd frontend && npm run build` -> PASS (built in 1.21s)
- Coverage: `cd frontend && npm run test:coverage` -> PASS (77 test files, 680 passed, 0 failed)
- Diff coverage: `scripts/diff-coverage.sh a66fd1a frontend` -> PASS (No lines with coverage info in diff)
- Line limits: all changed production files < 300 lines (`DashboardPage.tsx`: 260 lines)
- Contract: none (reused existing endpoints and types)
- Commit: 6973c45 4 files +205/-52
- 2026-10-31 lead: `VERDICT: PASS` (reviewer, round 1) — E2E onboarding, dashboard metrics and rent receipt PDF assertions cleanly verified.
- 2026-10-31 lead: DONE — user accepted.
