# 99 - FRONTEND-ONBOARDING-RESUME-AND-AGENCY-SETTINGS

Status: DONE
Branch: feat/97-auth-onboarding-language-and-personal-agency
Base: bae8626
Size: M
Round: 0/1

## Goal

Persist the onboarding wizard progression and draft in user-scoped `localStorage`, allow users to skip to the dashboard (`/dashboard`), display an onboarding progression widget on the dashboard with a "Resume onboarding" CTA, replace `useCompanies()` on the dashboard with `useAgency()`, and add an "Agence" tab in `/settings/agency` (`LmnpPage.tsx`) allowing users to view and edit their agency profile (switching between Personal Agency and Professional Agency).

## Files

Context (read only): `frontend/src/pages/onboarding/OnboardingStepNav.tsx`, `frontend/src/api/queries.ts`.
Writable frontend:
- `frontend/src/pages/onboarding/useOnboardingPersistence.ts` (new)
- `frontend/src/pages/onboarding/useOnboardingTypes.ts` (new)
- `frontend/src/pages/onboarding/onboardingRequests.ts` (new)
- `frontend/src/pages/onboarding/useOnboardingState.ts`
- `frontend/src/pages/onboarding/OnboardingPage.tsx`
- `frontend/src/pages/onboarding/OnboardingPage.css`
- `frontend/src/pages/onboarding/OnboardingPage.test.tsx`
- `frontend/src/router.tsx`
- `frontend/src/router.test.tsx`
- `frontend/src/pages/dashboard/OnboardingProgressCard.tsx` (new)
- `frontend/src/pages/dashboard/OnboardingProgressCard.css` (new)
- `frontend/src/pages/dashboard/DashboardPage.tsx`
- `frontend/src/pages/dashboard/DashboardPage.test.tsx`
- `frontend/src/pages/settings/AgencySection.tsx` (new)
- `frontend/src/pages/settings/AgencySection.css` (new)
- `frontend/src/pages/settings/AgencySection.test.tsx` (new)
- `frontend/src/pages/settings/LmnpPage.tsx`
- `frontend/src/pages/settings/LmnpPage.test.tsx`
- `frontend/src/i18n/resources/fr.ts`
- `frontend/src/i18n/resources/en.ts`
Affected tests: `frontend/src/router.test.tsx`, `frontend/src/pages/dashboard/DashboardPage.test.tsx`, `frontend/src/pages/settings/LmnpPage.test.tsx`, `frontend/src/pages/settings/AgencySection.test.tsx`, `frontend/src/pages/onboarding/OnboardingPage.test.tsx`.
Touched E2E: none.

## Constraints

Onboarding draft and step persisted to `localStorage` under `homeofficeexpenses.onboarding.<userId>` · `OnboardingPage.tsx` includes *"Passer au tableau de bord"* action (`data-cy="btn-skip-onboarding"`) · `router.tsx` `RequireAuth` allows accessing the dashboard when user chooses to skip onboarding · `DashboardPage.tsx` displays `OnboardingProgressCard` when `onboardingCompleted === false`, with *"Reprendre l'inscription"* (`data-cy="btn-resume-onboarding"`) redirecting to `/welcome` · `DashboardPage.tsx` removes `useCompanies()` call and reads agency data from `useAgency()` · `/settings/agency` adds third tab "Agence" rendering `AgencySection.tsx` with Personal vs Professional toggle, updating via `PUT /api/agency` · every production component < 300 lines · builder commits once, nobody pushes.

## Acceptance

- [x] Leaving or reloading `/welcome` preserves draft data and active step in `localStorage`.
- [x] Users can click *"Passer au tableau de bord"* and navigate to `/dashboard` even if onboarding is not completed.
- [x] On `/dashboard`, when `onboardingCompleted === false`, `OnboardingProgressCard` lists completed steps and renders *"Reprendre l'inscription"*, which opens `/welcome` at the saved step.
- [x] `DashboardPage` uses `useAgency()` without calling `useCompanies()`, cleanly displaying agency or personal management details.
- [x] `/settings/agency` contains an "Agence" tab with `AgencySection`, allowing toggling between Personal and Professional agency and saving via `PUT /api/agency`.
- [x] All tests pass in `DashboardPage.test.tsx`, `AgencySection.test.tsx`, `LmnpPage.test.tsx`, and `router.test.tsx`; changed-line coverage >= 80%.

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh bae8626 frontend`.

## Evidence

- `router.test.tsx`: skip onboarding navigation test RED -> GREEN (19/19 pass)
- `DashboardPage.test.tsx`: useAgency without useCompanies, personal agency display, OnboardingProgressCard resume CTA tests RED -> GREEN (8/8 pass)
- `AgencySection.test.tsx`: profile render, toggle personal agency, save API tests RED -> GREEN (3/3 pass)
- `LmnpPage.test.tsx`: agence tab switch and agency profile render tests RED -> GREEN (16/16 pass)
- `OnboardingPage.test.tsx`: skip button navigation and localStorage restore tests RED -> GREEN (16/16 pass)
- Gate test:coverage: PASS (79 files, 737 tests passed)
- Gate lint: PASS (eslint 0 errors)
- Gate format:check: PASS (prettier clean)
- Gate build: PASS (vite build clean, 2464 modules)
- Gate diff-coverage: PASS (116 lines, 88% >= 80% vs bae8626)
- E2E: skipped (no touched spec)
- Deviations: none
- Contract impact: none
- Commit: 7754fe8 20 files +1252/-169
- 2026-10-31 reviewer: VERDICT: PASS — Onboarding persistence, resume flow, dashboard progress card, and settings agency tab verified with full coverage and no blockers.
- 2026-10-31 lead: DONE — user accepted.
