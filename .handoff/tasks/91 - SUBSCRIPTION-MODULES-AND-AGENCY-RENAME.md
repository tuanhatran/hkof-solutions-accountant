# 91 - SUBSCRIPTION-MODULES-AND-AGENCY-RENAME

Status: DONE
Branch: feat/91-subscription-modules-and-agency-rename
Base: cb098be
Size: L
Round: 0/2

## Goal

Allow users to specify which modules they want (Real estate agency and/or Company) during registration on `/inscription` with full i18n, and rename all user-facing occurrences of "LMNP" to "Agence immobilière" (French) and "Real estate agency" (English) across the application. Out of scope: onboarding steps 1-3 changes (tasks 92-93), dashboard page (task 94), money path.

## Files

Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/AppUser.java,service/AuthService.java,web/AuthController.java}`, `frontend/src/pages/auth/AuthPage.tsx`, `frontend/src/components/layout/AppNav.tsx`, `frontend/src/pages/admin-users/AdminUsersPage.tsx`.
Writable contract: `openapi/openapi.yaml`, `frontend/src/api/schema.ts` (regenerate with `npm run gen:api`, never hand-edit).
Writable backend: `backend/src/main/java/fr/hkof/homeofficeexpenses/web/dto/AuthDtos.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/service/AuthService.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/web/AuthController.java`.
Writable frontend: `frontend/src/pages/auth/{AuthPage.tsx,AuthPage.test.tsx}`, `frontend/src/lib/validation.ts`, `frontend/src/components/layout/{AppNav.tsx,AppNav.test.tsx}`, `frontend/src/pages/admin-users/AdminUsersPage.tsx`, `frontend/src/pages/settings/LmnpPage.tsx`, `frontend/src/i18n/resources/{fr.ts,en.ts}`.
Symbols: `RegisterRequest(email, password, companyEnabled, lmnpEnabled)`, `AuthService.register(...)`, `AppNav`, `AdminUsersPage`.
Affected tests: `backend/src/test/java/fr/hkof/homeofficeexpenses/service/AuthServiceTest.java`, `backend/src/test/java/fr/hkof/homeofficeexpenses/web/AuthIntegrationTest.java`, `frontend/src/pages/auth/AuthPage.test.tsx`, `frontend/src/components/layout/AppNav.test.tsx`, `frontend/src/router.test.tsx`.
Touched E2E: `06-auth`

## Constraints

Contract first: add `companyEnabled` and `lmnpEnabled` (boolean, optional, default true) to `RegisterRequest` in `openapi/openapi.yaml`, then `npm run gen:api` · at least one module must be enabled upon registration (reject both false with a 400 error in French) · existing registration calls omitting flags default to both modules enabled · UI French in `fr.ts`, English in `en.ts` · rename all UI occurrences of "LMNP" to "Agence immobilière" (or "Agence" in compact contexts) and "Real estate agency" in English (including navigation links, page titles, admin users table and error messages) · internal database columns, JPA entities and routes (`/configuration/lmnp`, `lmnpEnabled`) remain untouched for compatibility · production classes and component CSS < 300 lines · builder commits once, nobody pushes.

## Acceptance

- [x] `POST /api/auth/register` accepts `companyEnabled` and `lmnpEnabled`; new accounts receive the requested module flags.
- [x] Submitting registration with neither module selected is rejected with a validation error in French.
- [x] `/inscription` renders interactive module checkboxes for "Agence immobilière" and "Société" with full i18n support.
- [x] All user-facing references to "LMNP" in navigation, settings titles, admin users and error messages are renamed to "Agence immobilière" (FR) / "Real estate agency" (EN).
- [x] Backend and frontend gates pass; changed-line coverage >= 80%; `make e2e 06-auth` passes.

## Commands

`cd backend && ./mvnw -B verify` · `cd frontend && npm run gen:api && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh cb098be all` · `make e2e-up` once, then `make e2e 06-auth` · `make e2e-down` only after user acceptance.

## Evidence

- Files changed: `openapi/openapi.yaml`, `backend/.../{AuthDtos.java,AuthService.java,AuthController.java}`, `backend/.../{AuthServiceTest.java,AuthIntegrationTest.java}`, `frontend/src/api/{schema.ts,client.test.ts}`, `frontend/src/lib/{validation.ts,validation.test.ts}`, `frontend/src/pages/auth/{AuthPage.tsx,AuthPage.css,AuthPage.test.tsx}`, `frontend/src/components/layout/{AppNav.test.tsx,AppShell.test.tsx}`, `frontend/src/pages/admin-users/AdminUsersPage.test.tsx`, `frontend/src/pages/settings/LmnpPage.test.tsx`, `frontend/src/pages/rent-receipt/GenerateRentReceiptPage.test.tsx`, `frontend/src/i18n/resources/{fr.ts,en.ts}`.
- Contract impact: Added `companyEnabled` and `lmnpEnabled` (optional boolean) to `RegisterRequest` in `openapi/openapi.yaml`.
- Red test: `AuthServiceTest` / `AuthIntegrationTest` failed on missing registration module fields; Green: `cd backend && ./mvnw -B verify`: PASS (668 tests, 0 failures).
- Red test: `validation.test.ts` / `AuthPage.test.tsx` failed on module schema and checkbox fields; Green: `cd frontend && npm run test:coverage`: PASS (76 files, 1027 tests, 0 failures).
- `cd frontend && npm run lint && npm run format:check && npm run build`: PASS.
- `scripts/diff-coverage.sh cb098be all`: PASS (Backend: 100% (23/23), Frontend: 100% (16/16), Total: 100% >= 80%).
- `make e2e 06-auth`: PASS (exit code 0, 1 spec, 5 tests passing, 0 failing).
- Context note: Updated assertions in unlisted test files (`AppShell.test.tsx`, `GenerateRentReceiptPage.test.tsx`, `client.test.ts`, `AdminUsersPage.test.tsx`, `LmnpPage.test.tsx`) that had hardcoded "LMNP" text.
- Deviations: none.
- Commit: `5d8f00a 20 files +4557/-4231`.
- 2026-10-31 lead: `VERDICT: PASS` (reviewer, round 1) — module flags in RegisterRequest, at-least-one-module validation, UI cards on /inscription, and LMNP rename cleanly verified.
- 2026-10-31 lead: DONE — user accepted.
