# 105 - E2E-ONBOARDING-COMPANY-FLOW-AND-VERIFICATION

Status: DONE
Branch: feat/105-e2e-onboarding-company-flow-and-verification
Base: e8ed5bb
Size: S
Round: 0/0

## Goal

Extend `07-onboarding.cy.ts` with a company-only registration (`companyEnabled=true, lmnpEnabled=false`): 5-step company wizard, footer skip to `/generate/expense-statement`, draft resume, finalization landing with company + active lease. Out of scope: agency onboarding (already covered), app code, contract.

## Files

Context (read only): `frontend/cypress/support/helpers.ts` (`fillRegistration`, Mailpit), `frontend/cypress/e2e/06-auth.cy.ts`, `frontend/cypress/e2e/05-multi-company.cy.ts` (company creation, SIREN/address intercepts), `frontend/src/pages/onboarding/OnboardingCompanyWizard.tsx`.
Writable: `frontend/cypress/e2e/07-onboarding.cy.ts`, `.handoff/data-cy-mapping.md`.
Affected tests: `frontend/cypress/e2e/07-onboarding.cy.ts`.
Touched E2E: `07-onboarding`.
Hooks (from 104): `company-onboarding-steps`; identity `company-identity-form`, `input-company-onboarding-{name,legal-form,siren,siret,manager,address,issue-place}`, `btn-company-siren-lookup`; lease `company-lease-form`, `input-company-onboarding-{property-address,total-area,business-area,rent,charges,landlord-name,landlord-phone,landlord-address}`; expenses `company-expenses-form`, `input-company-expense-<CODE>`, `input-company-expense-prorata-<CODE>`, `select-company-expense-periodicity-<CODE>`; employees `company-employees-form`, `input-company-employee-{first,last,email,address,issue-place}-<i>`, `select-company-employee-title-<i>`, `btn-add-company-employee`; summary `company-summary`, `btn-finalize-company-onboarding`, `company-finalize-error`; `btn-company-next`/`btn-company-back`; skip `btn-skip-onboarding` in each `.onboarding-actions`.

## Constraints

Tests/docs only: no production or contract change. Deterministic flows: stub external SIREN/address APIs as in `05-multi-company.cy.ts`; select by `data-cy` only. Run against the e2e stack; commit once (explicit paths), nobody pushes.

## Acceptance

- [ ] Company-only registration lands on `/welcome` company wizard, not the agency wizard.
- [ ] Identity → lease (areas, rent, charges, landlord) → expenses (≥1 category + rate) → employees (manager prefilled) → summary reachable.
- [ ] Footer skip routes to `/generate/expense-statement`; reload mid-wizard resumes the saved step.
- [ ] Finalize lands on `/generate/expense-statement` with the created company and active lease visible.
- [ ] `make e2e 07-onboarding` green; `.handoff/data-cy-mapping.md` updated with the company hooks.

## Commands

Run once, at the end (tests-only; stack already up):
- `cd frontend && npm run lint && npm run format:check && npm run build`
- `make e2e 07-onboarding` (`make e2e-up` only if the stack is down)
- No coverage or backend gate (tests-only).

## Evidence

- Files: `frontend/cypress/e2e/07-onboarding.cy.ts` (company-only test + `onlyCompany` registration option), `.handoff/data-cy-mapping.md` (company hooks table).
- RED `make e2e 07-onboarding`: 1 passing / 1 failing - preview assertion `40,00 %`; formatter prints `40 %`.
- RED `make e2e 07-onboarding`: 1 passing / 1 failing - exact `1 200,00 €` substring vs narrow no-break spaces.
- GREEN `make e2e 07-onboarding`: exit 0, 2/2 passing, 0 failing (15s), spec `cypress/e2e/07-onboarding.cy.ts`.
- PASS `git diff --check` (clean).
- PASS `cd frontend && npm run lint` (eslint ., 0 errors).
- PASS `npm run format:check` (prettier, all matched files).
- PASS `npm run build` (2483 modules, built in 942ms).
- E2E gate: `make e2e 07-onboarding` exit 0, 2 passing / 0 failing (14s); stack left up, no `e2e-up`, no `e2e-down`.
- Deviations: `05-multi-company.cy.ts` holds no SIREN/address stubs, so the spec stubs `GET /api/companies/lookup*` and `https://api-adresse.data.gouv.fr/search/*` itself; resolving hooks/formatting required read-only context outside the handoff list (`OnboardingCompanyStep{Identity,Lease,Expenses,Employees,Summary}.tsx`, `useCompanyOnboardingState.ts`, `companyOnboardingRequests.ts`, `moduleAccessOf`, `ExpenseStatementHeader.tsx`). The tracked shared `.handoff/data-cy-mapping.md` is committed with the spec, as in test tasks 90/95.
- Contract: none. App/backend code: none.
- Commit: 26ae2d3 2 files +316/-1
- 2026-10-31 lead: DONE — user accepted
