# 83 - CROSS-USER-COMPANY-LEASE

Status: TODO
Branch: feat/83-cross-user-company-lease
Base: 77a9bf3
Size: L
Round: 0/2

## Goal

Enable a landlord user creating or editing a commercial lease (companyLease = true) to link the lease to a corporate tenant (Company) owned by another account via SIREN lookup, granting read-only access to the company's public legal identity attributes on the lease without exposing internal company data or granting mutation rights. Out of scope: rent receipt cross-user query & bundle attachment (task 84).

## Files

Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/Company.java,domain/Lease.java,service/CompanyService.java,service/LeaseService.java,service/OwnershipContext.java}`, `openapi/openapi.yaml`.
Routes: `GET /api/companies/lookup`, `POST /api/leases`, `PUT /api/leases/{id}`, `GET /api/leases/{id}`.
Writable backend: `backend/src/main/resources/db/migration/V27__cross_user_company_lease.sql`; `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/Lease.java,repository/CompanyRepository.java,repository/LeaseRepository.java,service/CompanyService.java,service/LeaseService.java,web/CompanyController.java,web/LeaseController.java,web/dto/CompanyDtos.java,web/dto/LeaseDtos.java}`; `backend/src/test/java/fr/hkof/homeofficeexpenses/{service/LeaseServiceTest.java,service/CompanyServiceTest.java,web/CompanyLeaseIntegrationTest.java,web/UserIsolationIntegrationTest.java}`.
Writable frontend/contract: `openapi/openapi.yaml`, `frontend/src/api/schema.ts`, `frontend/src/pages/settings/lmnp/LeaseDialog.tsx`, `frontend/src/pages/settings/lmnp/LeaseDialog.test.tsx`.
Affected tests: `backend/src/test/java/fr/hkof/homeofficeexpenses/web/{CompanyLeaseIntegrationTest.java,MultiLeaseExpensesIntegrationTest.java,UserIsolationIntegrationTest.java}`.
Touched E2E: `01-rent-receipt`

## Constraints

Contract first: `openapi/openapi.yaml` adds `GET /api/companies/lookup?siren=...` (returns public legal identity: name, siren, legalForm, address, managerName; 404 if not found), then `npm run gen:api`. Money untouched (`CalculationService` only). Security: landlord user CANNOT update, delete, or inspect private fields (pro-rata surface calculation, active lease, expense items, employees) of another user's company. A cross-user company is strictly a read-only counterparty on the lease. V27 migration adapts active lease company unique constraint so that a landlord's lease can reference a corporate tenant without colliding with owner-scoped company indexes; never edit V1–V26. Production classes < 300 lines; builder commits once with explicit paths; nobody pushes.

## Acceptance

- [ ] Landlord user can search Company ABC by SIREN and create a company lease linked to Company ABC owned by another account.
- [ ] The lease displays Company ABC's identity details on preview and detail views.
- [ ] Landlord user cannot edit or delete another user's company (`PUT /api/companies/{id}` and `DELETE` return 404 COMPANY_NOT_FOUND).
- [ ] Backend verify green, frontend build and tests green, changed-line coverage >= 80%, Cypress `01-rent-receipt` passes; production classes < 300 lines.

## Commands

`cd backend && ./mvnw -B verify` · `cd frontend && npm run gen:api && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 77a9bf3 all` · `make e2e-up` once then `make e2e 01-rent-receipt` (leave stack up; `make e2e-down` only after acceptance).

## Evidence

(Append one line per event; builder appends evidence and sets REVIEW)
