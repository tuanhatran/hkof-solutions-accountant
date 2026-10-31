# 101 - FRONTEND-NAV-ADMINISTRATION-AND-ONBOARDING-SKIP

Status: DONE
Branch: feat/101-frontend-nav-administration-and-onboarding-skip
Base: f7a1d32
Size: M
Round: 0/1

## Goal

Rename the sidebar settings navigation section to "Administration" across i18n locales, and relocate the onboarding skip button from the top header bar into the step action footer across all wizard steps. Out of scope: changing onboarding step logic or modifying backend endpoints.

## Files

Context (read only): `frontend/src/components/layout/AppNav.css`, `frontend/src/pages/onboarding/OnboardingStepNav.tsx`.
Writable frontend:
- `frontend/src/components/layout/AppNav.tsx`
- `frontend/src/i18n/resources/fr.ts`
- `frontend/src/i18n/resources/en.ts`
- `frontend/src/pages/onboarding/OnboardingPage.tsx`
- `frontend/src/pages/onboarding/OnboardingPage.css`
- `frontend/src/pages/onboarding/OnboardingStepProfile.tsx`
- `frontend/src/pages/onboarding/OnboardingStepProperty.tsx`
- `frontend/src/pages/onboarding/OnboardingStepLease.tsx`
- `frontend/src/pages/onboarding/OnboardingStepSummary.tsx`
- `frontend/src/components/layout/AppNav.test.tsx`
- `frontend/src/pages/onboarding/OnboardingPage.test.tsx`
Affected tests: `frontend/src/components/layout/AppNav.test.tsx`, `frontend/src/pages/onboarding/OnboardingPage.test.tsx`.
Touched E2E: `07-onboarding`.

## Constraints

Contract: none · UI French default with English translation · `data-cy="btn-skip-onboarding"` must be preserved on the relocated skip button in step action bars · every production class and component CSS < 300 lines · builder commits once, nobody pushes.

## Acceptance

- [x] Sidebar section title for settings renders "Administration" in French (`fr.ts`) and "Administration" in English (`en.ts`).
- [x] Skip button is removed from `.onboarding-header-actions` in `OnboardingPage.tsx`.
- [x] Skip button (`data-cy="btn-skip-onboarding"`) is rendered inside `.onboarding-actions` on profile, property, lease, and summary steps.
- [x] Clicking skip button persists current draft progress, marks onboarding skipped in session storage, and routes to `/dashboard`.
- [x] Unit tests pass and `make e2e 07-onboarding` passes.

## Commands

Run once, at the end:
- frontend: `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- coverage: `scripts/diff-coverage.sh f7a1d32 frontend` (>= 80% changed lines)
- e2e: `make e2e-up` once, then `make e2e 07-onboarding`

## Evidence

- Files: 12 frontend files (AppNav/AppShell tests, fr/en i18n, OnboardingPage.tsx/.css/.test, OnboardingSkipButton.tsx new, 4 step components).
- RED `npx vitest run AppNav.test.tsx OnboardingPage.test.tsx`: 4 failed | 28 passed (Administration title, skip footer placement).
- GREEN same command: 32 passed (AppNav 13, OnboardingPage 19).
- RED `npx vitest run AppShell.test.tsx` after the i18n rename: 2 failed; GREEN: 11 passed.
- `npx vitest run AppShell AppNav OnboardingPage i18n.test router DashboardPage TemplatesPage`: PASS 89 tests.
- `npm run test:coverage`: PASS 79 files / 1068 tests, exit 0.
- `npm run lint`: PASS 0 errors. `npm run format:check`: PASS all matched files.
- `npm run build`: PASS, built in 1.38s.
- `scripts/diff-coverage.sh f7a1d32 frontend`: PASS 100% (4 measured lines, 0 missing).
- `make e2e 07-onboarding`: PASS exit 0, spec 07-onboarding.cy.ts, 1/1 passing, 0 failing.
- Line limits: OnboardingPage 290, SkipButton 20, StepProfile 297, StepProperty 156, StepLease 296, StepSummary 234, CSS 159 (<300).
- Deviations: `AppShell.test.tsx` and new `OnboardingSkipButton.tsx` were not in the handoff writable list; AppShell asserted the old section titles and the extraction kept OnboardingPage under 300 lines.
- Contract: none. E2E stack left running.
- Commit: 9208826 12 files +134/-18
- 2026-10-31 lead: VERDICT: PASS (reviewer, round 1)
- 2026-10-31 lead: DONE — user accepted
