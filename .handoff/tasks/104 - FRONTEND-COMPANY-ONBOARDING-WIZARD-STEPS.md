# 104 - FRONTEND-COMPANY-ONBOARDING-WIZARD-STEPS

Status: DONE
Branch: feat/104-frontend-company-onboarding-wizard-steps
Base: 8e9fbcf
Size: L
Round: 0/2

## Goal

Implement the 5-step company onboarding wizard at `/welcome` for company-enabled accounts (identity, lease + display-only pro-rata preview, expense categories, employees, resumable finalization) and widen the module gate so a company-only account can create its landlord and company lease. Out of scope: agency steps (101/103) and E2E (105).

## Files

Context (read only): `frontend/src/pages/onboarding/{OnboardingStepNav.tsx,useOnboardingState.ts,useOnboardingPersistence.ts,onboardingPeople.ts,OnboardingSkipButton.tsx,profileSchema.ts}`, `frontend/src/pages/settings/{CompanySection.tsx,CompanyIdentityModal.tsx,CompanyLeaseExpensesModal.tsx,EmployeeSection.tsx,ExpenseItemsManager.tsx}`, `frontend/src/components/ui/{AddressAutocomplete.tsx,Button.tsx,FieldGroup.tsx}`, `frontend/src/components/settings/CompanySirenLookup.tsx`, `frontend/src/lib/validation.ts`, `frontend/src/api/queries.ts`.
Writable frontend:
- `frontend/src/pages/onboarding/{OnboardingPage.tsx,OnboardingPage.css,OnboardingPage.test.tsx,OnboardingCompanyStepNav.tsx,useCompanyOnboardingState.ts,useCompanyOnboardingPersistence.ts,companyOnboardingRequests.ts}`
- `frontend/src/pages/onboarding/{OnboardingCompanyStepIdentity.tsx,OnboardingCompanyStepLease.tsx,OnboardingCompanyStepExpenses.tsx,OnboardingCompanyStepEmployees.tsx,OnboardingCompanyStepSummary.tsx}`
- `frontend/src/pages/onboarding/{OnboardingCompanySteps.css,useCompanyOnboardingState.test.ts,OnboardingCompanySteps.test.tsx}`
- `frontend/src/i18n/resources/{fr.ts,en.ts}`
Writable backend/contract: `backend/src/main/java/fr/hkof/homeofficeexpenses/config/ModuleAccessFilter.java`, `backend/src/test/java/fr/hkof/homeofficeexpenses/web/ModuleAccessIntegrationTest.java`, `openapi/openapi.yaml` (descriptions only).
Affected tests: `frontend/src/pages/onboarding/OnboardingPage.test.tsx`, `backend/src/test/java/fr/hkof/homeofficeexpenses/web/ModuleAccessIntegrationTest.java`.
Touched E2E: `05-multi-company`.

## Constraints

Module gate: `/api/leases` and `/api/landlords` require LMNP **or** company (403 only when neither); `/api/persons`, `/api/tenants`, `/api/rent-receipts`, `/api/agency` stay LMNP-only; received rent receipts stay company-readable. Update the OpenAPI route descriptions.
Track: `companyEnabled && !lmnpEnabled` -> company wizard; both -> track selector; agency-only -> existing agency wizard. Skip stays in the footer (`data-cy="btn-skip-onboarding"`) and targets `moduleAccess.homePath` for company, `/dashboard` for agency.
Company fields are limited to the real contract (`CompanyRequest`: name, legalForm, siren, siret, address, managerName, issuePlace); do not invent capital/RCS/VAT fields. No authoritative client calculation: the pro-rata preview is display-only; the backend `CalculationService` remains the reference.
Finalization (resumable, no duplicates): `api.landlords.create` -> `api.companies.create` -> `api.leases.create` (`companyLease=true`, `companyId`, `landlordId`, `propertyAddress`, `totalArea`, `businessArea`, `rentExclCharges`, `charges`, no natural tenant) -> link the company lease (`api.companies.update` with `leaseId` when the active lease requires it) -> `api.expenseItems.create` per selected category -> `api.employees.create` -> `completeOnboardingSession()` -> navigate `/generate/expense-statement`. Persist the draft and created ids; a retry must not duplicate rows; a failure keeps the summary with a French error.
Expense categories reuse the existing codes/labels (Loyer, Électricité, Gaz/Chauffage, Internet & Téléphonie, Assurance habitation) with `proRataPct`/`periodicity`; employee titles use the `EmployeeTitle` enum and the manager is prefilled from the profile. Expose stable `data-cy` for each step and action. UI French + en, no `any`, classes/CSS < 300 lines, colocated CSS conventions. Commit once, no push.

## Acceptance

- [ ] Company-only accounts see the 5-step company wizard; both-module accounts see a track selector; agency-only onboarding is unchanged.
- [ ] Identity captures name, legal form, SIREN/SIRET lookup, address autocomplete, manager; lease captures address, areas with a display-only pro-rata, rent/charges and landlord; expenses and employees capture the listed fields.
- [ ] Summary finalization creates landlord, company, company lease, expense items and employee, marks onboarding complete, and lands on `/generate/expense-statement` with the company and active lease; a retry does not duplicate.
- [ ] Company-only accounts can call `/api/leases` and `/api/landlords`; LMNP-only and neither-module accounts keep the correct 403s; backend integration tests cover all three.
- [ ] Backend + frontend gates green; `scripts/diff-coverage.sh 8e9fbcf all` >= 80% each side; `make e2e 05-multi-company` green.

## Commands

Run once, at the end:
- backend: `cd backend && ./mvnw -B verify`
- types: `cd frontend && npm run gen:api`
- frontend: `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- coverage: `scripts/diff-coverage.sh 8e9fbcf all` (>= 80% changed lines each side)
- e2e: `make e2e 05-multi-company` (stack is already up; `make e2e-up` only if it is not)

## Evidence

(Append one line per event; never rewrite a previous line)
- Files: backend ModuleAccessFilter + ModuleAccessIntegrationTest; openapi descriptions; frontend 16 onboarding files + fr/en i18n + OnboardingPage/tests; schema.ts regenerated.
- RED backend companyOnlyAccountCanUseSharedRoutes: /api/leases 403 instead of 200 -> GREEN 7 tests, 0 failures.
- RED frontend company state/steps tests: unresolved company modules -> GREEN 7 + 9 tests.
- PASS `cd backend && ./mvnw -B verify`: 697 tests, 0 failures, 0 errors, 1 skipped; BUILD SUCCESS.
- PASS `cd frontend && npm run test:coverage`: 82 files, 1088 tests passing; lint, format:check, build (tsc + vite) exit 0.
- PASS `scripts/diff-coverage.sh 8e9fbcf all`: backend 100% (8 changed lines), frontend 88% (369 changed lines, 43 missing).
- PASS `make e2e 05-multi-company`: exit 0, spec 05-multi-company.cy.ts, 2/2 passing; stack left running.
- Contract: descriptions only for shared /api/leases and /api/landlords; no path/schema change; schema.ts regenerated.
- Deviations: added OnboardingAgencyWizard.tsx, OnboardingCompanyWizard.tsx, OnboardingTrackSelector.tsx for the 300-line split; French uses "Espace société" / "inscription société" to satisfy the existing i18n terminology guard; no spec update.
- Commit: e8ed5bb 24 files +3333/-271
- reviewer: PASS (round 1/2) — shared gate, contract descriptions-only + generated schema, idempotent finalization, display-only pro-rata, track/skip routing all validated. Non-blocking: shared route is method-agnostic (account-scoped, no tenant/receipt route); real finalize path delegated to 105 E2E.
- 2026-10-31 lead: DONE — user accepted
