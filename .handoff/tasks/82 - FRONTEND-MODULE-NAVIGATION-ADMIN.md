# 82 - FRONTEND-MODULE-NAVIGATION-ADMIN

Status: TODO
Branch: feat/82-frontend-module-navigation-admin
Base: 77a9bf3
Size: M
Round: 0/2

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

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 77a9bf3 frontend` · `make e2e-up` once then `make e2e 06-auth` (leave stack up; `make e2e-down` only after acceptance).

## Evidence

(Append one line per event; builder appends evidence and sets REVIEW)
