# 93 - FRONTEND-ONBOARDING-PROPERTIES-AND-LEASES

Status: DONE
Branch: feat/93-frontend-onboarding-properties-and-leases
Base: 4bfca07
Size: M
Round: 0/2

## Goal

Overhaul Onboarding Step 2 to "Biens" (Properties) to support multiple properties with distinct landlord details (removing rent & charges), overhaul Step 3 "Baux" (Leases) to attach leases to a selected property with individual amounts per tenant (for individual leases) or total amounts (for solidary colocation), and update summary and finalization with full i18n. Out of scope: dashboard page (94), backend contract changes, money calculation logic.

## Files

Context (read only): `frontend/src/api/{endpoints.ts,types.ts}`, `frontend/src/components/ui/AddressAutocomplete.tsx`, `frontend/src/pages/onboarding/OnboardingStepProfile.tsx`.
Writable frontend: `frontend/src/pages/onboarding/{OnboardingStepProperty.tsx,OnboardingStepLease.tsx,OnboardingStepSummary.tsx,OnboardingPage.tsx,useOnboardingState.ts,OnboardingPage.css}`, `frontend/src/i18n/resources/{fr.ts,en.ts}`.
Writable tests: `frontend/src/pages/onboarding/OnboardingPage.test.tsx`.
Symbols: `OnboardingStepProperty`, `OnboardingStepLease`, `OnboardingStepSummary`, `useOnboardingState`, `propertySchema`, `leaseFormSchema`.
Affected tests: `frontend/src/pages/onboarding/OnboardingPage.test.tsx`.
Touched E2E: `none`

## Constraints

Frontend only; reuse existing `POST /api/persons` and `POST /api/leases` APIs · Step 2 is titled "Biens" (FR) / "Properties" (EN); rent and charges are completely removed from Step 2 · user can add one or multiple properties; each property captures its address (via `AddressAutocomplete`) and landlord details (first name, last name, phone with country code, email, address note) · landlord is distinct from the agency manager · Step 3 lets the user select which property the lease belongs to · "Bail individuel" captures individual rent excl. charges and charges for each tenant · "Colocation solidaire" captures 2+ co-tenants and a single total rent + charges · finalization creates landlord persons, tenant persons, and the corresponding individual leases (one per tenant) or colocation lease (with all tenants) via the existing backend API · all texts translated via `i18n` in `fr.ts` and `en.ts` · production classes and component CSS < 300 lines · builder commits once, nobody pushes.

## Acceptance

- [x] Step 2 is titled "Biens"; rent and charges fields are removed.
- [x] Users can add multiple properties, each with its address and distinct landlord details.
- [x] Step 3 provides a property selector to associate the lease with one of the created properties.
- [x] In "Bail individuel", multiple tenants can be added, each with their own separate rent and charges.
- [x] In "Colocation solidaire", multiple co-tenants share a single lease with a total rent and charges amount.
- [x] Step 4 displays the structured properties, landlords, and leases with their respective amounts.
- [x] Finalize successfully persists landlords, tenants, and leases, then marks onboarding complete.
- [x] Frontend tests pass, lint/format/build pass, changed-line coverage >= 80%.

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 4bfca07 frontend` · E2E: skipped (no touched spec).

## Evidence

- TDD RED: `cd frontend && npx vitest run src/pages/onboarding/OnboardingPage.test.tsx` -> FAIL (5 failed, 6 passed)
- TDD GREEN: `cd frontend && npx vitest run src/pages/onboarding/OnboardingPage.test.tsx` -> PASS (13 passed in 2.85s)
- Lint: `cd frontend && npm run lint` -> PASS (0 errors, 0 warnings)
- Format check: `cd frontend && npm run format:check` -> PASS (All matched files use Prettier code style)
- Build: `cd frontend && npm run build` -> PASS (tsc -b && vite build in 1.27s)
- Coverage: `cd frontend && npm run test:coverage` -> PASS (77 test files, 680 passed, 0 failed)
- Diff coverage: `scripts/diff-coverage.sh 4bfca07 frontend` -> PASS (changed-line coverage 89%, 114/127 lines >= 80%)
- E2E: skipped (no touched spec)
- Line limits: all changed production files < 300 lines (OnboardingPage: 288, OnboardingStepLease: 293, OnboardingPropertyCard: 189, OnboardingStepProperty: 152, OnboardingStepSummary: 238, OnboardingTenantCard: 117, useOnboardingState: 293, OnboardingStepNav: 37, OnboardingPage.css: 131)
- Contract: none (existing POST /api/persons and POST /api/leases reused)
- Commit: e29bf24 11 files +1171/-374
- 2026-10-31 lead: `VERDICT: PASS` (reviewer, round 1) — Multi-property landlord management, property-lease association, individual/colocation amounts and finalization persistence cleanly verified.
- 2026-10-31 lead: DONE — user accepted.
