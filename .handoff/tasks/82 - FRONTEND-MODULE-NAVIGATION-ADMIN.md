# 82 - FRONTEND-MODULE-NAVIGATION-ADMIN

Status: DONE
Branch: feat/82-frontend-module-navigation-admin
Base: 26e9661
Size: M
Round: 1/2

## Goal

Dynamically adapt sidebar navigation in AppNav, route guards in router.tsx, and document listings in HistoryPage and TemplatesPage according to the authenticated user's active modules (companyEnabled, lmnpEnabled), and provide an administration view (/admin/utilisateurs) for ADMIN users. Out of scope: backend changes (task 81), cross-user linking (tasks 83-84).

## Files

Context (read only): `frontend/src/api/schema.ts`, `frontend/src/components/layout/AppShell.tsx`, `frontend/src/components/layout/AppNav.tsx`, `frontend/src/router.tsx`.
Writable frontend: `frontend/src/components/layout/AppNav.tsx`, `frontend/src/router.tsx`, `frontend/src/pages/history/HistoryPage.tsx`, `frontend/src/pages/templates/TemplatesPage.tsx`, `frontend/src/pages/admin-users/AdminUsersPage.tsx`, `frontend/src/pages/admin-users/AdminUsersPage.css`, `frontend/src/api/queries.ts`, `frontend/src/api/endpoints.ts`, `frontend/src/i18n/resources/fr.ts`, `frontend/src/i18n/resources/en.ts`, `frontend/src/components/layout/AppNav.test.tsx`, `frontend/src/router.test.tsx`, `frontend/src/pages/admin-users/AdminUsersPage.test.tsx`, `frontend/src/pages/history/HistoryPage.test.tsx`.
Affected tests: `frontend/src/router.test.tsx`, `frontend/src/components/layout/AppNav.test.tsx`, `frontend/src/pages/history/HistoryPage.test.tsx`.
Touched E2E: `06-auth`

## Constraints

Contract: none (consumes schema.ts from task 81). UI French messages; amounts in euros, dates DD/MM/YYYY; no `any`. If user has only `companyEnabled`: show "Note de frais", "Entreprise", hide "Quittance de loyer", hide "LMNP", filter history to expense statements only, filter templates to note-frais only. If user has only `lmnpEnabled`: show "Quittance de loyer", "LMNP", hide "Note de frais", hide "Entreprise", filter history to rent receipts only, filter templates to quittance only. If both enabled: show all. If user role is `ADMIN`: show "Administration utilisateurs" link in navigation leading to `/admin/utilisateurs`. Attempting to access a route belonging to an inactive module redirects to the active generator route. Production classes and CSS < 300 lines; builder commits once with explicit paths; nobody pushes.

## Acceptance

- [ ] User with Company module only sees only Company navigation, history, and templates; accessing `/generer/quittance` redirects to `/generer/note-frais`.
- [ ] User with LMNP module only sees only LMNP navigation, history, and templates; accessing `/generer/note-frais` redirects to `/generer/quittance`.
- [ ] User with ADMIN role sees `/admin/utilisateurs` and can toggle module switches for users; non-admin accessing `/admin/utilisateurs` is redirected.
- [ ] Frontend tests pass, lint/format/build pass, changed-line coverage >= 80%, Cypress `06-auth` passes.

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 26e9661 frontend` · `make e2e-up` once then `make e2e 06-auth`, `make e2e 00-settings`, `make e2e 02-expense-statement`, `make e2e 04-admin-templates` (shared nav/router/TemplatesPage regression; leave stack up; `make e2e-down` only after acceptance).

## Evidence

- Files: `frontend/src/api/endpoints.ts`, `frontend/src/api/queries.ts`, `frontend/src/components/layout/AppNav.tsx` (+test), `frontend/src/router.tsx` (+test), `frontend/src/pages/history/HistoryPage.tsx` (+test), `frontend/src/pages/templates/TemplatesPage.tsx`, `frontend/src/pages/admin-users/AdminUsersPage.tsx`/`.css`/`.test.tsx`, `frontend/src/i18n/resources/fr.ts`/`en.ts`; also `AdminLlmPage.test.tsx`, `LmnpPage.test.tsx` (copy alignment, see deviation).
- Red->green AppNav (4 new): FAIL module links/admin link absent -> PASS 11/11.
- Red->green router (4 new): FAIL no guards (`/generer/quittance` stayed) -> PASS 9/9.
- Red->green HistoryPage (2 new): FAIL both listings shown -> PASS 28/28.
- Red->green AdminUsersPage (5 new): FAIL module import missing -> PASS 5/5.
- `npm run test:coverage`: PASS 71 files, 972 tests, lines 96.38%.
- `npm run lint`: PASS (no findings). `npm run format:check`: PASS. `npm run build`: PASS (2432 modules).
- `scripts/diff-coverage.sh 26e9661 frontend`: PASS 82% (76 changed lines, 13 missing).
- `make e2e 06-auth`: PASS exit 0, 5/5. `make e2e 00-settings`: PASS exit 0, 7/7. `make e2e 02-expense-statement`: PASS exit 0, 12/12 first run. `make e2e 04-admin-templates`: PASS exit 0, 5/5 first run. Stack left up.
- Line limits: AppNav 234, router 242, HistoryPage 220, AdminUsersPage 148, CSS 43.
- Deviations: `git commit <paths>` records worktree content, so the pre-existing unrelated en.ts hunks (4 shortened descriptions) entered the commit together with mine; `PageHeader.css` stays uncommitted. `AdminLlmPage.test.tsx`/`LmnpPage.test.tsx` (outside writable list) had assertions on the replaced English copy and were aligned so the suite is green; no test weakened.
- Contract: none. `openapi/openapi.yaml`, backend and `schema.ts` untouched.
- Commit: dd6503c 16 files +923/-52.
- 2026-10-30 lead: `VERDICT: BLOCKERS (3)` (reviewer, round 1) — (1) HistoryPage still calls `useAllRentReceipts`/`useLeases` for company-only users -> 403 MODULE_LMNP_DISABLED banner; (2) `homePath` falls back to `/generer/quittance` with both modules off -> router redirect loop; (3) admin route/nav tests pass pre-fix (no red-then-green). Fix all three, strengthen tests red-first, re-run frontend gates + four E2E specs.
- 2026-10-30 builder round 1 fixes. Files: `frontend/src/api/queries.ts`, `frontend/src/router.tsx` (+test), `frontend/src/components/layout/AppNav.test.tsx`, `frontend/src/pages/history/HistoryPage.tsx` (+test), `frontend/src/pages/history/HistoryMonthSection.tsx`.
- Red->green HistoryPage (2 new): FAIL `receiptsEnabledArgs.at(-1)`/`companiesEnabledArgs.at(-1)` undefined, 403 banner and LMNP-only column shown -> PASS 30/30. Queries gated with TanStack `enabled`; disabled-side loading/error/refetch/columns suppressed.
- Red->green router (4 new): FAIL no `/aucun-module` heading on `/` and `/generer`, company-only `/` stayed `/generer/quittance` -> PASS 13/13.
- Red->green blocker 3 (strengthened, run on 26e9661 router/AppNav restored afterwards): FAIL "uses administration page" (no `Utilisateurs` heading/table), non-admin (no `Quittance de loyer`), mobile admin link, USER filtered mobile nav -> PASS 13/13 router, 13/13 AppNav. The old USER assertion alone still passes pre-fix (7 links), now covered by the filtered-nav assertions.
- `npm run test:coverage`: PASS 71 files, 980 tests, lines 96.44%. `npm run lint`: PASS. `npm run format:check`: PASS. `npm run build`: PASS (built in 1.11s).
- `scripts/diff-coverage.sh 26e9661 frontend`: PASS 89% (92 changed lines, 10 missing).
- `make e2e 06-auth`: PASS exit 0, 5/5 first run. `make e2e 00-settings`: PASS 7/7 first run. `make e2e 02-expense-statement`: PASS 12/12 first run. `make e2e 04-admin-templates`: PASS 5/5 first run. Stack left up.
- Line limits: router 260, HistoryPage 227, HistoryMonthSection 167. `PageHeader.css`, backend, `openapi/openapi.yaml`, `schema.ts` untouched; no `any`.
- Contract: none. Deviation: none.
- Commit: 117af1a 7 files +359/-75.
- 2026-10-30 lead: `VERDICT: PASS` (reviewer, round 2) — module queries gated with TanStack `enabled`, `/aucun-module` guard-free fallback for both flags off, admin route/nav tests genuinely red pre-fix; 980 frontend tests, 89% diff coverage, four E2E specs first-run green.
- 2026-10-30 lead: `DONE — user accepted`
