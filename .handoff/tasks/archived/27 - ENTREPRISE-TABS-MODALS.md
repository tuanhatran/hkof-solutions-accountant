# ENTREPRISE-TABS-MODALS

Status: DONE
Branch: feature/entreprise-tabs-modals
Size: L
Round: 2/2

## Goal

Reorganise the Entreprise page into 3 tabs (Info générale / Baux & Frais / Salariés) under the always-visible company selector, with company create/edit, lease link, expense-item and employee forms as `FormModal` dialogs (Annuler/Valider), per plan `docs/superpowers/plans/2026-10-25-entreprise-page-tabs.md` (tasks 1-8, execute in order). Out of scope: backend, `openapi/openapi.yaml`, LMNP page, monetary calculation.

## Files

Context (read only): `docs/superpowers/specs/2026-10-25-entreprise-page-tabs-design.md`, `frontend/src/components/ui/FormModal.tsx`, `frontend/src/pages/settings/LmnpPage.tsx`, `frontend/src/components/settings/PersonForm.tsx`, `frontend/src/lib/validation.ts`
Writable: `frontend/src/pages/settings/` (`CompanySection.tsx`, `SettingsPage.tsx`, `ExpenseItemsManager.tsx`, `ExpenseItemForm.tsx`, `EmployeeSection.tsx`, `EmployeeForm.tsx`; new `useCompanyForm.ts`, `CompanyIdentityModal.tsx`, `CompanyIdentityView.tsx`, `CompanyLeaseModal.tsx`, `CompanyLeaseView.tsx`; delete `CompanyForm.tsx`, `SettingsLeaseSection.*`, `SettingsSaveBar.*`), `frontend/src/components/ui/ViewTabs.tsx` (+CSS), `frontend/cypress/e2e/00-settings.cy.ts`, `05-multi-company.cy.ts`
Affected tests: `SettingsPage.test.tsx`, `EmployeeSection.test.tsx`, `ExpenseItemForm.test.tsx`, `ExpenseItemsManager.test.tsx`, `ViewTabs.test.tsx` + new tests per plan

## Constraints

Contract: none · Money: `CalculationService` only (prorata server-side, untouched) · UI French · no `any` · no commit or push · `data-cy` hook names preserved, read-only views use new hooks (`info-societe`, `bail-societe-lie`, `prorata-bail-societe`), never duplicated in DOM · production files < 300 lines

## Acceptance

- [x] Selector + 3 tabs always rendered; default tab Info générale read-only; "Modifier"/"Nouvelle société" open identity modal with Annuler/Valider
- [x] Baux & Frais: read-only lease + `CompanyLeaseModal`; expense items add/edit in modal; Salariés add/edit in modal
- [x] E2E specs 00 and 05 migrated to tab→modal flows, one full suite run green
- [x] Coverage gates met: frontend `npm run test:coverage` >= 90% lines/statements/functions/branches; backend `cd backend && ./mvnw -B verify` stays >= 90% LINE/BRANCH (untouched); lint + format:check + build clean

## Commands

- frontend: `cd frontend && npm run test && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- backend: `cd backend && ./mvnw -B verify`
- e2e (one full run, record exit code + spec/test counts): `make e2e`

## Evidence

Append one line per event; never rewrite a previous line.

- `2026-10-25 lead:` builder hit its turn limit at task 8 without appending gate evidence; final clean E2E run status unknown at that point.
- `2026-10-25 user:` ran the full E2E suite — "All tests pass" (relayed by lead verbatim; user-executed gate, chosen as option (b)).
- `2026-10-25 lead:` E2E gate accepted on user-reported green run; routing to reviewer round 1.
- `2026-07-31 reviewer r1:` BLOCKERS (2) — code is statically clean (contract untouched, prorata display-only, no data-cy coexistence, stale-state and Annuler/Escape paths pinned by tests); blockers are evidence-only: unit/coverage/lint/format/build never run or recorded on this tree, and the E2E line lacks command/exit code/spec-test counts.
- `2026-10-25 builder r2:` frontend `npm run test:coverage` PASS — 53 files / 522 tests passed, exit 0; Vitest global All files: 97.11% stmts / 90.23% branch / 94.78% funcs / 97.25% lines (all >= 90).
- `2026-10-25 builder r2:` frontend `npm run lint` exit 0; `npm run format:check` exit 0 ("All matched files use Prettier code style"); `npm run build` exit 0 (✓ built in 1.10s).
- `2026-10-25 builder r2:` backend `cd backend && ./mvnw -B verify` PASS exit 0 — BUILD SUCCESS, 478 tests, 0 failures, 1 skipped; JaCoCo bundle LINE 97.29%, BRANCH 92.31% (>= 90 gate).
- `2026-10-25 builder r2:` E2E single full run `make e2e` exit 0 — 6 specs / 26 tests, all passed first attempt ("All specs passed! 01:07 26 26 0 failing"), no retries; teardown `down -v --remove-orphans` OK; make wall time 2m02s.
- `2026-10-25 builder r2:` no production code changed this round (evidence-only); retained whitespace-only `frontend/src/components/layout/AppShell.tsx:90-91` needed for format:check; contract untouched (`openapi/openapi.yaml` unmodified).
- `2026-10-25 reviewer r2:` PASS — round-1 evidence blockers resolved with real numbers (Vitest 522 tests exit 0, four metrics >= 90; backend verify exit 0 LINE 97.29/BRANCH 92.31; `make e2e` exit 0, 6 specs/26 tests first attempt, no retries); no openapi/backend changes; AppShell diff verified whitespace-only; largest file 287 lines. Recorded by lead on reviewer's behalf.
- `2026-10-25 lead:` USER_REVIEW — awaiting user acceptance.
- `2026-10-25 lead:` DONE — user accepted.
