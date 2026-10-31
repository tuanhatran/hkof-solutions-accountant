# 97 - BACKEND-AGENCY-ENTITY-AND-API

Status: DONE
Branch: feat/97-auth-onboarding-language-and-personal-agency
Base: 4394181
Size: M
Round: 0/1

## Goal

Establish a dedicated backend `Agency` entity, repository, service, and REST API (`/api/agency`, GET/PUT) decoupled from the corporate company module (`MODULE_COMPANY`), update the OpenAPI contract, add migration `V30__agency.sql` with backfill for existing users, and expose frontend queries (`useAgency`).

## Files

Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/AppUser.java,domain/Company.java,config/ModuleAccessFilter.java,config/DataInitializer.java}`.
Writable contract: `openapi/openapi.yaml`, `frontend/src/api/schema.ts` (regenerated via `npm run gen:api`).
Writable backend:
- `backend/src/main/resources/db/migration/V30__agency.sql`
- `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/Agency.java`
- `backend/src/main/java/fr/hkof/homeofficeexpenses/repository/AgencyRepository.java`
- `backend/src/main/java/fr/hkof/homeofficeexpenses/service/AgencyService.java`
- `backend/src/main/java/fr/hkof/homeofficeexpenses/web/AgencyController.java`
- `backend/src/main/java/fr/hkof/homeofficeexpenses/web/dto/AgencyDtos.java`
- `backend/src/main/java/fr/hkof/homeofficeexpenses/config/ModuleAccessFilter.java`
- `backend/src/main/java/fr/hkof/homeofficeexpenses/config/DataInitializer.java`
- `backend/src/test/java/fr/hkof/homeofficeexpenses/service/AgencyServiceTest.java`
- `backend/src/test/java/fr/hkof/homeofficeexpenses/web/AgencyIntegrationTest.java`
- `backend/src/test/java/fr/hkof/homeofficeexpenses/web/ModuleAccessIntegrationTest.java`
Writable frontend:
- `frontend/src/api/endpoints.ts`
- `frontend/src/api/queries.ts`
- `frontend/src/api/queries.test.ts`
Affected tests: `backend/src/test/java/fr/hkof/homeofficeexpenses/web/ModuleAccessIntegrationTest.java`, `frontend/src/api/queries.test.ts`.
Touched E2E: none.

## Constraints

Contract first: define `/api/agency`, `AgencyDto`, and `AgencyRequest` in `openapi/openapi.yaml`, then `npm run gen:api` · `/api/agency` is gated under `LMNP_PREFIXES` in `ModuleAccessFilter.java` so it is protected by `lmnpEnabled` and completely independent of `companyEnabled` · `Agency` has columns `(id, user_id, name, is_personal, manager_name, legal_form, siren, siret, address, created_at, updated_at)` with a unique constraint on `user_id` · `V30__agency.sql` backfills existing users from existing companies/persons · every production class < 300 lines · builder commits once, nobody pushes.

## Acceptance

- [x] `V30__agency.sql` creates table `agency` with unique `user_id` constraint and backfills existing user records.
- [x] `GET /api/agency` returns the authenticated user's agency profile (or 204 No Content if none).
- [x] `PUT /api/agency` creates or updates the authenticated user's agency profile and returns `AgencyDto`.
- [x] Accounts with `companyEnabled = false, lmnpEnabled = true` can access `/api/agency` without `MODULE_COMPANY_DISABLED` 403 error.
- [x] Backend tests (`AgencyServiceTest`, `AgencyIntegrationTest`, `ModuleAccessIntegrationTest`) and frontend `queries.test.ts` pass.
- [x] Changed-line test coverage >= 80% on backend and frontend via `scripts/diff-coverage.sh 4394181 all`.

## Commands

`cd backend && ./mvnw -B verify` · `cd frontend && npm run gen:api && npm run test && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 4394181 all`.

## Evidence

- Files changed: 19 files (`Agency.java`, `AgencyRepository.java`, `AgencyService.java`, `AgencyController.java`, `AgencyDtos.java`, `V30__agency.sql`, `ModuleAccessFilter.java`, `DataInitializer.java`, `openapi.yaml`, `endpoints.ts`, `queries.ts`, `types.ts`, `schema.ts`, and tests).
- PASS `cd backend && ./mvnw test -Dtest=AgencyServiceTest` (4/4 tests).
- PASS `cd backend && ./mvnw test -Dtest=AgencyIntegrationTest` (3/3 tests).
- PASS `cd backend && ./mvnw test -Dtest=ModuleAccessIntegrationTest` (4/4 tests).
- PASS `cd backend && ./mvnw -B verify` (675 tests, 0 failures, 1 skipped).
- PASS `cd frontend && npm run gen:api` (schema.ts generated from openapi.yaml).
- PASS `cd frontend && npm run test:coverage` (78 files, 827 tests passed).
- PASS `cd frontend && npm run lint && npm run format:check && npm run build` (0 errors, build ok).
- PASS `scripts/diff-coverage.sh 4394181 all` (Backend: 96% / 95 lines; Frontend: 100% / 4 lines).
- E2E: skipped (no touched spec).
- Contract impact: `/api/agency` GET and PUT operations added, `AgencyDto` and `AgencyRequest` schemas defined.
- Deviations: `frontend/src/api/endpoints.test.ts` added to cover `api.agency.get()` and `api.agency.save()` for diff-coverage.
- Commit: 08ff5ec 19 files +5048/-4194
- 2026-10-31 reviewer: VERDICT: PASS — Agency entity, migration V30, REST endpoints, OpenAPI contract update, module access gate, and frontend API bindings verified with complete test coverage and no blockers.
- 2026-10-31 lead: DONE — user accepted.
