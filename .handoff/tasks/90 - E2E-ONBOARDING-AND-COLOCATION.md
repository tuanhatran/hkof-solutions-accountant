# 90 - E2E-ONBOARDING-AND-COLOCATION

Status: DONE
Branch: feat/90-e2e-onboarding-and-colocation
Base: 6a61fcd
Size: M
Round: 1/2

## Goal

Add `07-onboarding.cy.ts`: register a fresh user, complete the wizard with a drawn signature and a 2-co-tenant colocation lease, then assert both tenants on the generated rent receipt. Out of scope: production feature changes (86-89); only the minimum reset support the spec needs.

## Files

Context (read only): `frontend/cypress/e2e/{00-settings.cy.ts,01-rent-receipt.cy.ts,06-auth.cy.ts}`, `frontend/cypress/support/{e2e.ts,helpers.ts}`, `backend/src/main/java/fr/hkof/homeofficeexpenses/{service/E2eResetService.java,web/E2eController.java}`.
Writable backend: `backend/src/main/java/fr/hkof/homeofficeexpenses/service/E2eResetService.java` (only if a fresh un-onboarded fixture is needed).
Writable frontend: `frontend/cypress/e2e/07-onboarding.cy.ts`; `frontend/cypress/support/{e2e.ts,helpers.ts}`; `frontend/cypress.config.ts` (only if a new task is needed); `frontend/src/pages/onboarding/*.tsx` (`data-cy` attributes only, no behaviour or text change).
Writable handoff: `.handoff/data-cy-mapping.md` (record every new hook).
Touched E2E: `07-onboarding`

## Constraints

Stacked on task 89 head `6a61fcd` · Cypress only; no production feature change · seeded accounts stay onboarding-complete; the spec creates a unique fresh account through `/inscription` · explicit `data-cy` hooks only, new ones recorded in `.handoff/data-cy-mapping.md` · no hardcoded sleeps; rely on Cypress retryability · canvas drawing via pointer events on the pad · the quittance is a PDF blob: reuse the existing Cypress PDF-text task (`pdf-parse` is already a dependency; see `cypress.config.ts`) after downloading the receipt, and assert both co-tenant names there — never assert inside the PDF iframe DOM · `cy.resetState()` before registering; a unique e-mail per run · leave the stack up until user acceptance · builder commits once (including the mapping file, never the task handoff), nobody pushes.

## Acceptance

- [ ] A fresh registration lands on `/bienvenue`, not `/generer/quittance`.
- [ ] Step 1 fills identity, phone, address note, a 14-digit SIRET and draws a signature.
- [ ] Step 2 fills the property address and validates the pre-filled landlord.
- [ ] Step 3 selects colocation and adds two co-tenants.
- [ ] Finalize reaches `/generer/quittance`; the receipt preview lists both co-tenants.
- [ ] `make e2e 07-onboarding` passes with 0 failures on the first run; the mapping file lists every new hook.

## Commands

`cd frontend && npm run lint && npm run format:check && npm run build` · if `E2eResetService` changes: `cd backend && ./mvnw -B verify` · `make e2e-up` once, then `make e2e 07-onboarding` · `make e2e-down` only after user acceptance.

## Evidence

Files: `frontend/cypress/e2e/07-onboarding.cy.ts` (new), `frontend/cypress/support/e2e.ts` (self-auth spec set), `frontend/src/pages/onboarding/{OnboardingStepProfile,OnboardingStepProperty,OnboardingStepLease}.tsx` (`data-cy` attributes only), `.handoff/data-cy-mapping.md` (20 new hooks, section "Onboarding wizard hooks (task 90)"). `E2eResetService` unchanged, no backend gate.
Red→green: `make e2e 07-onboarding` FAIL missing `input-onboarding-first-name` (0/1) → FAIL blank-pad assertion (0/1) → PASS on first attempt (1 spec, 1 test, 0 failures, no retry).
PASS `make e2e 07-onboarding` exit 0 — 1 spec / 1 test passing, 0 failing, 0 skipped, 6480 ms.
PASS `npx vitest run src/pages/onboarding/OnboardingPage.test.tsx` — 6/6 tests.
PASS `npm run lint` — 0 errors. PASS `npm run format:check` — all files clean.
PASS `npm run build` — tsc + vite, 2448 modules. PASS `npm run test:coverage` — 76 files / 1023 tests.
PASS `scripts/diff-coverage.sh 6a61fcd frontend` exit 0 — no changed lines with coverage information (attribute-only additions); no global threshold.
PASS `git diff --check`. Contract: none.
Deviations/findings (pre-existing task 89, unchanged): the pad is portalled inside the profile form, so validating it also submits the profile and advances to step 2; the blank-canvas error assertion was dropped (would need a production behaviour change) and the drawn signature is proven by the intercepted `POST /api/signatures` 201 `name: "Signature dessinée"`. The signature toast is invisible on `/bienvenue` (route outside `AppShell`), so the spec does not assert a toast there.
Commit: c396d94 6 files +321/-6
Reviewer round 1 (6a61fcd..c396d94): VERDICT PASS — fresh account + steps 1-3 + 2 distinct co-tenants; both names asserted from downloaded PDF text via `readPdf`, not iframe DOM; `OnboardingStep*.tsx` attribute-only; `e2e.ts` self-auth set only `06-auth`+`07-onboarding`; mapping lists all 20 hooks.
- 2026-10-31 lead: DONE — user accepted
