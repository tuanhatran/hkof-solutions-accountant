# 81 - ADMIN-USER-MODULES

Status: TODO
Branch: feat/81-admin-user-modules
Base: 77a9bf3
Size: L
Round: 0/2

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

`cd backend && ./mvnw -B verify` · `cd frontend && npm run gen:api && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 77a9bf3 all` · `make e2e-up` once then `make e2e 06-auth` (leave stack up; `make e2e-down` only after acceptance).

## Evidence

(Append one line per event; builder appends evidence and sets REVIEW)
