# 87 - BACKEND-MULTI-TENANT-SIGNATURE-RENAME

Status: DONE
Branch: feat/87-backend-multi-tenant-signature-rename
Base: 1cdc636
Size: L
Round: 1/2

## Goal

Extend the contract and backend so leases accept several tenants, signatures can be renamed, onboarding can be completed (seeded accounts start complete), and colocation receipts join co-tenant names. Out of scope: frontend UI (88/89), the new E2E spec (90), money formulas.

## Files

Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/{Lease.java,LeaseTenant.java,Person.java,Company.java,RentReceipt.java},service/{AuthService.java,CalculationService.java},config/SeedUserInitializer.java}`, `openapi/openapi.yaml`.
Writable contract: `openapi/openapi.yaml`; `frontend/src/api/{schema.ts,types.ts}` (regenerate with `npm run gen:api`, never hand-edit `schema.ts`).
Writable backend: `backend/src/main/java/fr/hkof/homeofficeexpenses/{service/{SignatureService.java,LeaseService.java,LeaseMapper.java,RentReceiptService.java,RentReceiptAssembler.java,template/TemplateDataService.java},web/{SignatureController.java,LeaseController.java,AuthController.java},web/dto/{SignatureDtos.java,RentConfigurationDtos.java,CompanyDtos.java,AuthDtos.java},config/SeedUserInitializer.java}`.
Writable tests: `backend/src/test/java/fr/hkof/homeofficeexpenses/{service/{SignatureServiceTest.java,LeaseServiceTest.java,RentReceiptServiceTest.java,AuthServiceTest.java},web/{SignatureControllerIntegrationTest.java,CompanyLeaseIntegrationTest.java,MultiLeaseExpensesIntegrationTest.java}}`.
Affected tests: `backend/src/test/java/fr/hkof/homeofficeexpenses/web/{RentReceiptCrossUserIntegrationTest.java,ApiIntegrationTest.java,ApiErrorContractIntegrationTest.java}`.
Touched E2E: `01-rent-receipt`

## Constraints

Stacked on task 86 head `1cdc636` (V29 + `LeaseTenant` available) · contract first, then `npm run gen:api` · `PATCH /api/signatures/{id}` renames an owned active signature (404 + `ProblemDetail` otherwise) · `LeaseRequest` keeps `tenantId` (primary) and adds `tenantIds`; at least one tenant, no duplicates; `tenantId`-only callers stay valid; `LeaseDto` exposes the linked `tenantIds` read-only for the frontend · receipts fall back to `lease.tenant_id` when no `lease_tenant` row exists · French join in `locataire.nom` ("Alice DUPONT et Bob MARTIN", no trailing separator) plus a `locataires` list · `POST /api/auth/onboarding-complete` is idempotent and returns `CurrentUserDto` with `onboardingCompleted` · `/api/auth/me` exposes `onboardingCompleted` · `SeedUserInitializer` creates seeded accounts with `onboardingCompleted = true` (otherwise the task 89 guard would redirect every existing spec) · money untouched (`CalculationService`) · classes < 300 lines · builder commits once, nobody pushes.

## Acceptance

- [ ] `PATCH /api/signatures/{id}` renames; non-owned or deleted id returns 404.
- [ ] `POST /api/leases` with 2 `tenantIds` links both; empty and duplicate lists rejected; two leases share one address.
- [ ] Colocation receipt shows both names in `locataire.nom` and `locataires`; single-tenant receipts unchanged.
- [ ] `POST /api/auth/onboarding-complete` flips the flag once; seeded accounts are complete.
- [ ] Backend + frontend gates pass, coverage >= 80%, `make e2e 01-rent-receipt` green.

## Commands

`cd backend && ./mvnw -B verify` · `cd frontend && npm run gen:api && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 1cdc636 all` · `make e2e-up` once, then `make e2e 01-rent-receipt`.

## Evidence

Files: `openapi/openapi.yaml`; `frontend/src/api/schema.ts` (gen:api); backend `service/{AuthService,SignatureService,LeaseService,LeaseMapper,LeaseTenantBinder(new),template/TemplateDataService,E2eResetService}.java`, `web/{AuthController,SignatureController}.java`, `web/dto/{AuthDtos,SignatureDtos,RentConfigurationDtos}.java`, `config/SeedUserInitializer.java`; tests `service/{AuthServiceTest,SignatureServiceTest,LeaseServiceTest,template/TemplateDataServiceTest}.java`, `web/{AuthIntegrationTest,SignatureControllerIntegrationTest,CompanyLeaseIntegrationTest}.java`.
Red→green (targeted 75 tests, 0 failures): rename service+controller (404/400 covered); multi-tenant create/update/validation; colocation join 2/3 names + single unchanged; onboarding flip once + seeded complete; shared address + `tenantIds` integration.
PASS `cd backend && ./mvnw -B verify` — 658 tests, 0 failures, 1 skipped, BUILD SUCCESS. First run red: `E2eResetIntegrationTest` 2 failures (500, `lease_tenant` FK on batch delete) → fixed by deleting `lease_tenant` before `lease`.
PASS `npm run gen:api` (+102 schema lines) · PASS `npm run test:coverage` — 72 files / 992 tests, 0 failures · PASS `npm run lint` · PASS `npm run format:check` · PASS `npm run build`.
PASS `scripts/diff-coverage.sh 1cdc636 all` (exit 0) — backend 127 changed lines, 3 missing, 97%; frontend no covered changed lines (types only).
PASS `make e2e-up`; PASS `make e2e 01-rent-receipt` — exit 0, `01-rent-receipt.cy.ts` 2/2 passing, 0 failing; stack left up.
Contract impact: `openapi/openapi.yaml` — new `POST /api/auth/onboarding-complete`, new `patch` on `/api/signatures/{id}`, `CurrentUserDto.onboardingCompleted`, new schema `RenameSignatureRequest`, `LeaseRequest.tenantIds`, `LeaseDto.tenantIds` (readOnly).
Deviations: new `LeaseTenantBinder.java` (keeps `LeaseService` 268 lines) and `E2eResetService.java` (required by the new join rows); `TemplateDataServiceTest.java`/`AuthIntegrationTest.java` touched as the real data/controller tests, absent from the context list.
Assumption: `tenantIds: []` with `tenantId` set stays single-tenant; empty list alone → `LEASE_TENANT_REQUIRED`; `tenantId` must be included in `tenantIds`; primary first, remainder in request order.
Commit: 11bf9d0 22 files +793/-38
- 2026-10-31 lead: `VERDICT: PASS` (reviewer, round 1) — contract first, generated schema, tenant binding/update ordering, French join, rename 404, idempotent onboarding and seeded accounts verified; no blocker.
- 2026-10-31 lead: DONE — user accepted
