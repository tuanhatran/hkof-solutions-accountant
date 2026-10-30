# 81 - ADMIN-USER-MODULES

Status: DONE
Branch: feat/81-admin-user-modules
Base: 9383032
Size: L
Round: 1/2

## Goal

Add user roles (ADMIN, USER) and module flags (company_enabled, lmnp_enabled) to AppUser, seed thtran as ADMIN with both modules enabled, provide admin user management endpoints, enforce 403 MODULE_COMPANY_DISABLED / MODULE_LMNP_DISABLED on corresponding endpoints when inactive, and expose user profile in GET /api/auth/me. Out of scope: frontend UI changes (task 82), cross-user linking (tasks 83-84).

## Files

Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/AppUser.java,service/AuthService.java,web/AuthController.java,config/SecurityConfig.java}`, `backend/src/main/resources/db/migration/V19__auth.sql`, `openapi/openapi.yaml`.
Routes: `GET /api/admin/users`, `PATCH /api/admin/users/{id}/modules`, `PATCH /api/admin/users/{id}/role`, `GET /api/auth/me`.
Writable backend: `backend/src/main/resources/db/migration/V26__admin_user_modules.sql`; `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/AppUser.java,domain/UserRole.java,repository/AppUserRepository.java,service/AuthService.java,service/AdminUserService.java,web/AdminUserController.java,web/AuthController.java,web/dto/AuthDtos.java,web/dto/AdminUserDtos.java,config/SecurityConfig.java,config/ModuleAccessFilter.java,config/DataInitializer.java}`; `backend/src/test/java/fr/hkof/homeofficeexpenses/{web/AdminUserControllerIntegrationTest.java,web/ModuleAccessIntegrationTest.java,service/AdminUserServiceTest.java,service/AuthServiceTest.java}`.
Writable contract/config: `openapi/openapi.yaml`, `frontend/src/api/schema.ts`.
Affected tests: `backend/src/test/java/fr/hkof/homeofficeexpenses/web/{AuthIntegrationTest.java,ApiIntegrationTest.java,CompanyLeaseIntegrationTest.java,UserIsolationIntegrationTest.java}`.
Touched E2E: `06-auth`

## Constraints

Contract first: `openapi/openapi.yaml` adds `/api/admin/users` endpoints, error codes `MODULE_COMPANY_DISABLED`, `MODULE_LMNP_DISABLED`, `USER_NOT_FOUND`, and updates `CurrentUserDto` schema, then `npm run gen:api`. Money untouched (`CalculationService` only). French error messages. V26 migration adds `role VARCHAR(20) NOT NULL DEFAULT 'USER'`, `company_enabled BOOLEAN NOT NULL DEFAULT TRUE`, `lmnp_enabled BOOLEAN NOT NULL DEFAULT TRUE` to `app_user`; updates seeded `thtran` to `ADMIN`; never edit V1–V25. Non-admin accessing `/api/admin/**` returns 403 FORBIDDEN. Calling `/api/companies/**`, `/api/expense-statements/**`, `/api/expense-items/**` without `company_enabled` returns 403 `MODULE_COMPANY_DISABLED`. Calling `/api/leases/**`, `/api/rent-receipts/**`, `/api/persons/**` without `lmnp_enabled` returns 403 `MODULE_LMNP_DISABLED`. `app.security.enabled=false` keeps existing web tests green. Production classes < 300 lines; builder commits once with explicit paths; nobody pushes.

## Acceptance

- [ ] Migration V26 applies cleanly on fresh and upgraded schemas; seeded `thtran` is ADMIN with both modules enabled; seeded `e2e` user has both modules enabled.
- [ ] `GET /api/auth/me` returns `role`, `companyEnabled`, and `lmnpEnabled`.
- [ ] Admin endpoints allow an admin to list users and toggle module flags / roles; non-admin users receive 403.
- [ ] API endpoints under company routes reject users with `company_enabled=false` with 403 `MODULE_COMPANY_DISABLED`; LMNP endpoints reject users with `lmnp_enabled=false` with 403 `MODULE_LMNP_DISABLED`.
- [ ] Backend gates pass: `./mvnw -B verify`, `npm run gen:api`, changed-line coverage >= 80%, Cypress `06-auth` passes; production classes < 300 lines.

## Commands

`cd backend && ./mvnw -B verify` · `cd frontend && npm run gen:api && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 9383032 all` · `make e2e-up` once then `make e2e 06-auth`, `make e2e 02-expense-statement`, `make e2e 04-admin-templates` (regression specs for `/api/admin/llm`; leave stack up; `make e2e-down` only after acceptance).

## Evidence

- Files: 22 changed (backend prod/migration 13, tests 8, contract+generated 2); DataInitializer split -> SeedUserInitializer (268/64 lines); all production classes < 300 lines.
- Contract impact: `openapi/openapi.yaml` (admin user paths, UserRole/AdminUserDto/ModuleFlagsRequest/RoleRequest, CurrentUserDto role+companyEnabled+lmnpEnabled, 403/404 response refs on 34 module-gated operations) then `npm run gen:api` -> `frontend/src/api/schema.ts`.
- RED->GREEN AuthServiceTest 3 tests (role/companyEnabled/lmnpEnabled principal + ROLE_ADMIN/USER authority).
- RED->GREEN AdminUserServiceTest 5 tests (list, partial module update, empty update, role, USER_NOT_FOUND).
- RED->GREEN AdminUserControllerIntegrationTest 4 tests (/me fields, admin list+toggles, 403 non-admin, 404/400).
- RED->GREEN ModuleAccessIntegrationTest 3 tests (COMPANY/LMNP 403 with French details, fresh flags after login).
- RED->GREEN AdminUserModulesMigrationPostgresTest 2 tests (upgrade V25->V26, fresh schema, thtran ADMIN).
- PASS `cd backend && ./mvnw -B verify`: Tests run 625, failures 0, errors 0, skipped 1; BUILD SUCCESS.
- PASS `cd frontend && npm run test:coverage`: 70 files / 957 tests passed; `npm run lint` clean; `npm run format:check` clean; `npm run build` OK.
- PASS `scripts/diff-coverage.sh 9383032 all`: backend 99% (115 changed lines, 1 missing); frontend: generated schema excluded (no covered lines).
- PASS `make e2e-up` then `make e2e 06-auth`: exit 0, spec 06-auth.cy.ts 5 tests / 5 passing / 0 failing; stack left up.
- Deviations: DataInitializer split to keep < 300 lines; `UserDocumentIsolationIntegrationTest` users set ADMIN (LLM admin routes now admin-only); `DataInitializerTest` constructor updated; unrelated pre-existing edit `frontend/src/i18n/resources/en.ts` left uncommitted.
- Commit: 025be51 22 files +1459/-47
- 2026-10-30 lead: `VERDICT: BLOCKERS (1)` (reviewer, round 1) — `SecurityConfig` hasRole(ADMIN) on `/api/admin/**` blocks existing user-owned `/api/admin/llm` used by the e2e USER account in 02-expense-statement and 04-admin-templates. Scope admin role to the new user-management endpoints only; run the three E2E specs above.
- 2026-10-30 lead: `VERDICT: PASS` (reviewer, round 2) — fix commit 26e9661 scopes ADMIN to `/api/admin/users/**`; regression test red→green; 06-auth 5/5, 02-expense-statement 12/12, 04-admin-templates 5/5.

## Round 1 fix evidence

- Files changed: `backend/src/main/java/fr/hkof/homeofficeexpenses/config/SecurityConfig.java` (matcher scoped to `/api/admin/users`, `/api/admin/users/**`), `backend/src/test/java/fr/hkof/homeofficeexpenses/web/AdminUserControllerIntegrationTest.java`. Contract: none.
- RED: `./mvnw -B -q test -Dtest=AdminUserControllerIntegrationTest#nonAdminKeepsOwnLlmConfigButNotUserManagement` — GET /api/admin/llm expected 200, got 403 ACCESS_DENIED (1 failure), confirming the regression.
- GREEN: new test passes; full class 5 tests, 0 failures. Non-admin USER GET/PUT `/api/admin/llm` -> 200, `GET /api/admin/users` -> 403 ACCESS_DENIED.
- PASS targeted regression `AuthIntegrationTest,ModuleAccessIntegrationTest,UserIsolationIntegrationTest,UserDocumentIsolationIntegrationTest,E2eResetIntegrationTest`: 8+3+2+5+2 = 20 tests, 0 failures.
- PASS `cd backend && ./mvnw -B verify`: Tests run 626, Failures 0, Errors 0, Skipped 1; BUILD SUCCESS (exit 0).
- PASS `scripts/diff-coverage.sh 9383032 all`: backend 99% changed-line coverage (115 lines, 1 missing); frontend no coverage lines (generated schema only).
- PASS `make e2e 06-auth`: exit 0, spec 06-auth.cy.ts 5 tests / 5 passing / 0 failing (first run).
- PASS `make e2e 02-expense-statement`: exit 0, spec 02-expense-statement.cy.ts 12 tests / 12 passing / 0 failing (first run).
- PASS `make e2e 04-admin-templates`: exit 0, spec 04-admin-templates.cy.ts 5 tests / 5 passing / 0 failing (first run).
- Line limits: SecurityConfig 237, AdminUserControllerIntegrationTest 208 (< 300). Frontend untouched by this fix; stray `en.ts` edit left uncommitted. E2E stack left up.
- Commit: 26e9661 2 files +27/-1
- 2026-10-30 lead: `DONE — user accepted`
