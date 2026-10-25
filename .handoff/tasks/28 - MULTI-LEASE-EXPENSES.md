# 28 - MULTI-LEASE-EXPENSES

Status: DONE
Branch: feature/multi-lease-company-expenses
Size: L
Round: 0/2

## Goal

A company can hold several leases: the "Baux & Frais" tab lists the company's leases, a dropdown picks the active one, "Ajouter un bail" opens the LMNP `LeaseForm` modal with "Bail société" ticked and the company prefilled as tenant, and expenses (postes + notes de frais) are tied per lease. Out of scope: LMNP/person leases, rent receipts, templates, LLM.

## Plan

1. Backend: `leaseId` on `ExpenseItem` + `ExpenseStatement`, Flyway `V10` backfill from `Company.leaseId` (unassigned otherwise), services/filtering, contract, tests.
2. Frontend: lease list + active-lease dropdown in "Baux & Frais", reuse `LeaseForm` for add (company prefilled), expense managers keyed to the selected lease.
3. Money: pro-rata and totals recomputed from the selected lease via `CalculationService`; one backend total shared by screen/preview/PDF.

## Files

Context (read only): `domain/Lease.java`, `domain/Company.java`, `domain/ExpenseItem.java`, `domain/ExpenseStatement.java`, `service/LeaseService.java`, `service/CompanyService.java#linkLease`, `pages/settings/CompanySection.tsx`, `pages/settings/CompanyLeaseView.tsx`, `components/settings/LeaseForm.tsx`, `pages/settings/ExpenseItemsManager.tsx`, routes `GET/POST /api/leases`, `GET /api/companies`
Writable: `openapi/openapi.yaml` (+regenerated `frontend/src/api/schema.ts`), backend `domain`/`web/dto`/`service`/`web` expense + company classes, `db/migration/V10__*.sql`, `components/settings/LeaseForm.tsx`, `pages/settings/Company*`, new lease-list component + CSS, `ExpenseItemsManager.tsx`, expense-statement frontend flows, matching tests
Affected tests: `LeaseServiceTest`, `CompanyServiceTest`, `ExpenseItemServiceTest`, `ExpenseStatementServiceTest`, `ExpenseStatementLineCalculatorTest`, `CompanyLeaseIntegrationTest`, `MultiCompanyMigrationPostgresTest`, `CompanySection`/`CompanyLeaseView`/`CompanyLeaseModal`/`ExpenseItemsManager`/`SettingsPage`/`useExpenseStatementPage` vitest, cypress `00-settings`, `02-expense-statement`, `05-multi-company`

## Constraints

Contract: `openapi/openapi.yaml` — add `leaseId` to expense item/statement schemas and a `leaseId` filter on their list endpoints; reported in deliverable. Money: `CalculationService` only, `BigDecimal` HALF_UP scale 2. UI French · no `any` · logical deletion only · no commit or push.

## Acceptance

- [ ] "Baux & Frais" lists only leases with `companyId` = selected company; dropdown selects the active lease and drives pro-rata
- [ ] "Ajouter un bail" reuses the LMNP `LeaseForm` modal with "Bail société" checked and the company prefilled; created lease appears in the list
- [ ] Switching the active lease switches the postes/notes shown; each new poste/note records the selected `leaseId`
- [ ] V10 migration backfills `leaseId` from `Company.leaseId`, leaves orphans unassigned, never deletes rows
- [ ] One backend total shared by screen, preview and PDF; coverage gates met: backend `./mvnw -B verify` >= 90% LINE/BRANCH, frontend Vitest >= 90% lines/statements/functions/branches; production classes < 300 lines
- [ ] One full Cypress suite run, all specs green on first pass

## Commands

- backend: `cd backend && ./mvnw -B verify`
- frontend: `cd frontend && npm run typecheck && npm test && npm run test:coverage && npm run build`
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`

## Evidence

Append one line per event; never rewrite a previous line.

- `2026-10-25 lead:` builder round 1 hit the 150-turn cap after backend (domain, V11 migration — V10 already taken, services, contract, tests); frontend and all gates pending; Status stays TODO.
- `2026-10-25 builder run2 (frontend slice):` files: new `pages/settings/CompanyLeaseTab.tsx`+`.css`+`.test.tsx`, `components/settings/leaseFormDefaults.ts`+`.test.ts`; modified `api/schema.ts` (regenerated via `npm run gen:api`), `api/endpoints.ts`+`.test.ts`, `api/queries.ts`+`.test.ts`, `components/settings/LeaseForm.tsx` (+`presetCompanyId`), `pages/settings/CompanySection.tsx`, `CompanyLeaseView.tsx`+`.test.tsx`, `ExpenseItemsManager.tsx`+`.test.tsx`, `ExpenseItemForm.tsx`+`.test.tsx`, `SettingsPage.test.tsx`, `pages/expense-statement/useExpenseStatementPage.ts`+`.test.tsx`; deleted `CompanyLeaseModal.tsx`+`.css`+`.test.tsx` (allowed by task, re-covered in CompanyLeaseTab tests).
- Red→green: `endpoints.test.ts`/`queries.test.ts` leaseId scoping RED (param/queryKey missing) → GREEN; `leaseFormDefaults.test.ts` RED (module absent) → GREEN 3; `CompanyLeaseTab.test.tsx` RED (module absent, later RED 4 failed/3 passed on async + `within()` fixes) → GREEN 7; `useExpenseStatementPage.test.tsx` leaseId in calculate/preview/generate RED 3 failed/52 passed → GREEN 55.
- Gates: `npm run typecheck` PASS (0 errors) · `npm run lint` PASS (0 problems) · `npm run format:check` PASS after `prettier --write` on 8 touched files (first run flagged 8) · `npm test` PASS 530/530 (54 files) · `npm run test:coverage` PASS 530/530, All files 97.07% stmts / 90.18% branch / 94.78% funcs / 97.22% lines · `npm run build` PASS (845ms, pre-existing chunk-size warning).
- Contract impact: none added by this run — consumed run-1 `leaseId` fields + list filters exactly; `schema.ts` only via `gen:api`.
- Risks / deviations: (1) Cypress E2E and `./mvnw -B verify` NOT run in this slice (bounded to frontend gates by the task message; belong to run 3) — unverified. (2) Backend gap: `CompanyDto.leaseId` is derived (lowest-id active lease) and `CompanyService.linkLease` refuses releasing a company lease (400 FR), so the dropdown cannot persist a switch between two company leases; implemented as frontend-local selector scoping postes/notes via per-request `leaseId` (the mechanism the backend validates). (3) Statement-page `leaseId` comes from `activeCompany.leaseId` (same derivation); bodies include `leaseId` only when non-null, byte-identical historical bodies otherwise. (4) `POST /api/expense-statements/draft` accepts `leaseId` per contract but stays unwired (no app caller). (5) Non-linked lease shows a labeled "Prorata indicatif" client estimate; backend remains the only authoritative pro-rata. (6) `useExpenseStatementPage.ts` is 942 lines (pre-existing oversized hook; +25 lines here).
- Status stays TODO per task message; run 3 ends at REVIEW.
- `2026-10-25 lead:` builder run 3 hit the 150-turn cap after job 1 (lease re-point in `CompanyService`+tests, `openapi.yaml`, regenerated `schema.ts`, frontend wired) and frontend gates green; it appended no evidence lines — run 4 must re-run `cd backend && ./mvnw -B verify` and record real numbers, then Cypress spec updates + one full E2E run, evidence, Status REVIEW.
- `2026-10-25 builder run4 (gates + E2E):` files changed by this run: only `frontend/cypress/e2e/05-multi-company.cy.ts` (+ prettier wrap). Backend gate (covers run 1-3 code, never run before): `cd backend && ./mvnw -B verify` PASS exit 0 — Tests 497, Failures 0, Errors 0, Skipped 1; JaCoCo bundle LINE 97.34% (3590/3688), BRANCH 92.14% (1301/1412), "All coverage checks have been met" (>=90% both).
- Cypress update: `05-multi-company.cy.ts` rewritten for the new flow — `createAnnexeCompany` now asserts the lease list (`bail-societe-{id}`, "Bail actif" badge, `prorata-bail-societe` 25 %), "Ajouter un bail" from the tab (`btn-ajouter-bail-societe` → `formulaire-bail` with `input-bail-societe-type` checked + `select-bail-locataire-societe` prefilled), switching `select-bail-actif` persists (`PUT /api/companies` intercepted, `GET /api/companies/{id}.leaseId` = 2nd lease) and switches back; old `CompanyLeaseModal` selectors (`btn-modifier-bail-societe`, `select-bail-societe`, `btn-enregistrer-bail-societe`, `dialogue-formulaire-bail-societe`, `prorata-indicatif`) removed — cypress tree now has 0 stale references. `00-settings.cy.ts` / `02-expense-statement.cy.ts` audited, no stale data-cy, unchanged.
- Red→green (spec): old `05` block targeted deleted selectors (RED by construction against run-3 code); rewritten spec GREEN first execution, no retries.
- E2E: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` exit 0 — 6 specs, 26 tests, 26 passing, 0 failing/pending/skipped, "All specs passed!" in one run; re-executed to capture the exact exit code (first run's code was masked by a `| tail` pipe): 2nd full run also 26/26 exit 0. Teardown `down -v --remove-orphans` exit 0.
- Post-edit frontend check (spec-only change, no `src` edits): `npm run typecheck` PASS 0 errors · eslint on edited spec PASS · `npm run format:check` PASS. `npm test` not re-run (vitest does not execute cypress specs; 530/530 from run 3 stands). `codegraph sync` done.
- Contract impact: none this run. Deviations: none. Run-2 risk (2) (dropdown could not persist between two company leases) is resolved and now E2E-proven. Status → REVIEW (L), Round 0/2.
- `2026-10-25 reviewer: PASS (round 1) — no blockers: money stays in CalculationService/Amounts (BigDecimal, string transport), openapi+schema.ts+DTOs consistent and reported, V11/V2 additive backfills proven on PostgreSQL, lease scoping validated server-side, deleted modal re-covered, gates green with real evidence, full Cypress suite 26/26 first pass.
- `2026-10-25 lead: DONE — user accepted`
