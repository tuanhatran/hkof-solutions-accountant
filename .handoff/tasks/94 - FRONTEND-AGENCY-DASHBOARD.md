# 94 - FRONTEND-AGENCY-DASHBOARD

Status: DONE
Branch: feat/94-frontend-agency-dashboard
Base: e29bf24
Size: M
Round: 0/2

## Goal

Build the Agency Dashboard page (`/tableau-de-bord`) designed with `ui-ux-pro-max` adhering to the soft Material design system from `docs/user_plan/ui_dashboard.md`, showing agency information, portfolio KPI cards, quick actions, and portfolio lists, integrated into navigation and router. Out of scope: E2E Cypress tests (95), backend contract changes.

## Files

Context (read only): `docs/user_plan/ui_dashboard.md`, `frontend/src/api/{queries.ts,endpoints.ts,types.ts}`, `frontend/src/components/layout/AppShell.tsx`.
Writable frontend: `frontend/src/pages/dashboard/{DashboardPage.tsx,DashboardPortfolio.tsx,DashboardPage.css}`, `frontend/src/components/layout/AppNav.tsx`, `frontend/src/router.tsx`, `frontend/src/api/queries.ts`, `frontend/src/pages/onboarding/OnboardingPage.tsx`, `frontend/src/i18n/resources/{fr.ts,en.ts}`.
Writable tests: `frontend/src/pages/dashboard/DashboardPage.test.tsx`, `frontend/src/components/layout/AppNav.test.tsx`, `frontend/src/router.test.tsx`, `frontend/src/pages/onboarding/OnboardingPage.test.tsx`, `frontend/src/components/layout/AppShell.test.tsx`.
Symbols: `DashboardPage`, `DashboardPortfolio`, `AppNav`, `router`, `useModuleAccess`.
Affected tests: `frontend/src/components/layout/AppNav.test.tsx`, `frontend/src/router.test.tsx`, `frontend/src/pages/onboarding/OnboardingPage.test.tsx`, `frontend/src/components/layout/AppShell.test.tsx`.
Touched E2E: `none`

## Constraints

Frontend only · design follows `docs/user_plan/ui_dashboard.md` tokens: Public Sans typography, #1C252E primary ink, #FFFFFF cards with 16px radius and soft rgba(145, 158, 171, 0.2) elevation shadow scale, 8px button radius, #059669 / #EF4444 accents, max-width 1263px layout container · agency header displays Agency Name, Manager Name, SIREN/SIRET, address · 4 KPI cards: "Biens gérés" (property count), "Baux actifs" (lease count), "Locataires" (tenant count), "Total loyers mensuels" (formatted in EUR) · quick actions for "Générer une quittance", "Ajouter un bien", and "Gérer les baux" · recent properties and leases table/cards · add "Tableau de bord" in `AppNav` as the first item of the Agency module; route `/tableau-de-bord` protected by `ModuleRoute module="lmnp"` · onboarding wizard redirects to `/tableau-de-bord` upon completion · full i18n in `fr.ts` and `en.ts` · production classes and component CSS < 300 lines · builder commits once, nobody pushes.

## Acceptance

- [x] `/tableau-de-bord` renders with the soft Material design tokens (typography, cards, radius, elevation).
- [x] Agency profile card displays agency name, manager, SIRET/SIREN, and address.
- [x] Four KPI cards display accurate portfolio counts and formatted monthly rent totals.
- [x] Quick action buttons navigate to rent receipt generation and agency settings.
- [x] Overview section lists managed properties, landlords, and active tenants.
- [x] "Tableau de bord" is visible in `AppNav` when the agency module is active; onboarding redirects to `/tableau-de-bord`.
- [x] Frontend tests pass, lint/format/build pass, changed-line coverage >= 80%.

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh e29bf24 frontend` · E2E: skipped (no touched spec).

## Evidence

- TDD red: `AppNav.test.tsx` (8/13 failed), `router.test.tsx` (5/17 failed), `OnboardingPage.test.tsx` (2/13 failed), `DashboardPage.test.tsx` (1/1 suite failed, module not found).
- TDD green: `AppNav.test.tsx` (13/13 passed), `router.test.tsx` (17/17 passed), `OnboardingPage.test.tsx` (13/13 passed), `DashboardPage.test.tsx` (5/5 passed), `AppShell.test.tsx` (11/11 passed).
- Line limits: all changed production files < 300 lines (DashboardPage: 247, DashboardPortfolio: 132, DashboardPage.css: 143, AppNav: 242, router: 280, OnboardingPage: 288).
- `cd frontend && npm run lint`: PASS (0 errors, 0 warnings).
- `cd frontend && npm run format:check`: PASS (All matched files use Prettier code style).
- `cd frontend && npm run build`: PASS (built in 1.27s).
- `cd frontend && npm run test:coverage`: PASS (78 test files passed, 1050 tests passed).
- `scripts/diff-coverage.sh e29bf24 frontend`: PASS (87% coverage >= 80% threshold, 42/48 lines covered).
- E2E: skipped (no touched spec).
- Deviation: updated `OnboardingPage.test.tsx` and `AppShell.test.tsx` to account for new `/tableau-de-bord` route in navigation and onboarding completion redirect (missing from handoff writable tests). Extracted `DashboardPortfolio.tsx` from `DashboardPage.tsx` to maintain < 300 lines limit.
- Contract impact: none (pure frontend).
- Commit: a66fd1a 14 files +884/-18
- 2026-10-31 lead: `VERDICT: PASS` (reviewer, round 1) — Agency dashboard adhering to soft Material design tokens, KPI cards, quick actions, navigation and routing cleanly verified.
- 2026-10-31 lead: DONE — user accepted.
