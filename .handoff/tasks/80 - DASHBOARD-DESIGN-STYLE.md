# 80 - DASHBOARD-DESIGN-STYLE

Status: USER_REVIEW
Branch: feat/80-dashboard-design-style
Base: 73607b6
Size: M
Round: 1/2

## Goal

Apply the balanced, soft Material-inspired dashboard design system from `user_plan/ui_dashboard.md` to the application UI: Public Sans typography, #1C252E primary palette, soft shadows with #919EAB rgba elevation, 16px card radius, 8px button radius, 1263px layout container, and consistent hover/focus interactions. Out of scope: backend, contract, domain logic, renaming data-cy or breaking component tests.

## Files

Context (read only): `user_plan/ui_dashboard.md`, `frontend/src/components/layout/AppShell.tsx`, `frontend/src/components/layout/AppNav.tsx`, `frontend/src/components/ui/Button.tsx`
Writable: `frontend/index.html`, `frontend/src/index.css`, `frontend/src/components/layout/AppShell.css`, `frontend/src/components/layout/AppNav.css`, `frontend/src/components/ui/Dialog.css`
Affected tests: `frontend/src/components/layout/AppShell.test.tsx`, `frontend/src/components/layout/AppNav.test.tsx`, `frontend/src/router.test.tsx`

## Constraints

Contract: none · UI French · no `any` · tokens and @apply only (no arbitrary hex in component files) · builder commits once (explicit paths), nobody pushes · production classes and component CSS < 300 lines · keep all test selectors and data-cy intact.

## Acceptance

- [x] Google Font Public Sans loaded and configured as primary `--font-sans` with 14px body and 24px H4 hierarchy.
- [x] Theme palette updated with #1C252E primary/ink, #FFFFFF surface, #F4F6F8 elevated paper, #7B8186 muted, and #059669 / #EF4444 accents.
- [x] Cards have 16px radius, subtle border, and soft rgba(145, 158, 171, 0.2) shadow scale; buttons have 8px radius and interactive hover states.
- [x] Focus rings use rgb(0, 150, 255) / 2px offset; AppShell main container adheres to max-width 1263px.
- [x] Frontend tests pass, lint/format/build pass, changed-line coverage >= 80%, full E2E pass.

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 73607b6 frontend` (>= 80%) · `make e2e-up` once then `make e2e` (keep stack up; `make e2e-down` only after acceptance).

## Evidence

- Files changed: frontend/index.html, frontend/src/index.css, frontend/src/components/layout/AppShell.css, frontend/src/components/layout/AppNav.css, frontend/src/theme.test.ts
- Test `src/theme.test.ts`: RED (7 failed | 0 passed), then GREEN (7 passed in 462ms)
- `cd frontend && npm run test:coverage`: PASS (70 test files, 957 tests passed)
- `cd frontend && npm run lint`: PASS (0 errors, 0 warnings)
- `cd frontend && npm run format:check`: PASS (all matched files use Prettier code style)
- `cd frontend && npm run build`: PASS (built in 1.44s)
- `scripts/diff-coverage.sh 73607b6 frontend`: PASS (100%, 0 uncovered lines)
- E2E: `make e2e` exit code 0 (7 specs, 34 tests passed, 0 failed; stack running)
- Deviations: none
- Contract impact: none
- Commit: c2eedf2 5 files +157/-34
- 2026-10-30 reviewer: VERDICT: PASS (round 1) — Dashboard design system styling tokens, typography, radii, elevation shadows, and container constraints strictly follow the specification without contract or regression defects. Status set to USER_REVIEW.
