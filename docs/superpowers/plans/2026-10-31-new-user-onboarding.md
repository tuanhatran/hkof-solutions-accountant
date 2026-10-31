# New User Onboarding & Multi-Tenant Leases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an onboarding wizard (`/bienvenue`) for newly registered users to set up profile, agency (SIREN/SIRET), signature studio (upload, draw pad, cursive font generation), property address, and multi-tenant leases (both individual leases and joint colocation leases), with rent receipt colocation formatting.

**Architecture:** 
1. Database Flyway migration (`V29`) adds `lease_tenant` join table, `phone` and `address_note` on `person`, `siret` on `company`, `onboarding_completed` on `app_user`, and updates uniqueness indexes to permit multiple leases at the same address and multiple co-tenants per lease.
2. Backend entities, services (`LeaseService`, `SignatureService`, `RentReceiptService`), and `openapi/openapi.yaml` contract updated with multi-tenant leases, signature rename endpoint, and multi-tenant receipt generation.
3. Frontend provides a high-DPI HTML5 canvas signature drawer and cursive handwriting generator, plus a 3-step accessible onboarding wizard with routing guards.

**Tech Stack:** Java 25, Spring Boot 4.1.x, Flyway, PostgreSQL 17, React 19, TypeScript strict, Vite, Tailwind CSS, TanStack Query, React Hook Form + Zod, Cypress.

**Spec:** [docs/superpowers/specs/2026-10-31-new-user-onboarding-design.md](file:///home/thtran/Projects/hkof-solutions-accountant/docs/superpowers/specs/2026-10-31-new-user-onboarding-design.md)

## Global Constraints

- User-facing UI, validation messages, and document copy strictly in French.
- SIREN format: 9 digits. SIRET format: 14 digits (SIREN + 5-digit NIC).
- Amounts strictly formatted in Euros with `CalculationService` (`BigDecimal`, `RoundingMode.HALF_UP`, scale 2). Never `double`.
- Every production class and component CSS file must remain strictly under 300 lines.
- Changed-line test coverage >= 80% via `scripts/diff-coverage.sh <Base> backend|frontend|all`.
- No TypeScript `any`.

## Review Focus

1. **Colocation receipt name formatting with 2+ tenants**: Locataire label on rent receipt must cleanly join names (e.g., "Alice DUPONT et Bob MARTIN" or "Alice DUPONT, Bob MARTIN et Claire BERNARD") without trailing commas or broken syntax.
2. **SIRET vs SIREN validation**: Input must reject invalid length (e.g. 10 to 13 digits) while allowing either 9 digits (SIREN) or 14 digits (SIRET).
3. **Empty canvas signature submit prevention**: Signature drawing modal must reject blank / un-drawn canvas submissions with a clear French inline error message.
4. **Onboarding route loop prevention**: Completed onboarding must cleanly clear the redirect guard so the user can freely access `/generer/quittance` and settings without bouncing back to `/bienvenue`.
5. **Multiple leases at same address uniqueness**: Ensuring that creating 2 individual leases at the same property address (e.g. room 1 and room 2) succeeds without violating database uniqueness constraints.

---

### Task 1: Database Migration & Entity Mappings (Ticket 86)

**Files:**
- Create: `backend/src/main/resources/db/migration/V29__multi_tenant_leases_and_user_profile.sql`
- Create: `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/LeaseTenant.java`
- Create: `backend/src/main/java/fr/hkof/homeofficeexpenses/repository/LeaseTenantRepository.java`
- Modify: `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/Person.java`
- Modify: `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/Company.java`
- Modify: `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/AppUser.java`
- Modify: `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/Lease.java`
- Test: `backend/src/test/java/fr/hkof/homeofficeexpenses/service/MultiTenantMigrationPostgresTest.java`

**Interfaces:**
- Produces: `LeaseTenant` entity with `lease`, `person`, `primary` fields; `Person.getPhone()`, `Person.getAddressNote()`; `Company.getSiret()`; `AppUser.isOnboardingCompleted()`; `Lease.getTenants()`.

- [ ] **Step 1: Write failing Postgres migration integration test**
  Assert migration V29 runs cleanly, backfills existing single-tenant leases into `lease_tenant`, permits adding multiple leases at the same property address, and allows co-tenants on a lease.
- [ ] **Step 2: Run test to verify it fails**
  Run: `cd backend && ./mvnw -Dtest=MultiTenantMigrationPostgresTest test`
  Expected: FAIL with migration not found or entity mapping errors.
- [ ] **Step 3: Implement V29 SQL and JPA Entity updates**
  - Create table `lease_tenant (id BIGSERIAL PRIMARY KEY, lease_id BIGINT NOT NULL REFERENCES lease(id), person_id BIGINT NOT NULL REFERENCES person(id), is_primary BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`.
  - Add columns: `person.phone VARCHAR(30)`, `person.address_note VARCHAR(500)`, `company.siret VARCHAR(14)`, `app_user.onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE`.
  - Backfill `INSERT INTO lease_tenant (lease_id, person_id, is_primary) SELECT id, tenant_id, TRUE FROM lease WHERE tenant_id IS NOT NULL`.
  - Drop index `ux_lease_user_active_pair`; create unique index `ux_lease_tenant_pair ON lease_tenant (lease_id, person_id)`.
  - Update JPA classes (`Person`, `Company`, `AppUser`, `Lease`, `LeaseTenant`).
- [ ] **Step 4: Run test to verify it passes**
  Run: `cd backend && ./mvnw -Dtest=MultiTenantMigrationPostgresTest test`
  Expected: PASS
- [ ] **Step 5: Run backend verify gate**
  Run: `cd backend && ./mvnw -B verify`
  Expected: PASS

---

### Task 2: Backend Services, Signature Rename & Contract Updates (Ticket 87)

**Files:**
- Modify: `openapi/openapi.yaml`
- Modify: `backend/src/main/java/fr/hkof/homeofficeexpenses/service/SignatureService.java`
- Modify: `backend/src/main/java/fr/hkof/homeofficeexpenses/web/SignatureController.java`
- Modify: `backend/src/main/java/fr/hkof/homeofficeexpenses/service/LeaseService.java`
- Modify: `backend/src/main/java/fr/hkof/homeofficeexpenses/service/LeaseMapper.java`
- Modify: `backend/src/main/java/fr/hkof/homeofficeexpenses/service/RentReceiptService.java`
- Modify: `backend/src/main/java/fr/hkof/homeofficeexpenses/service/RentReceiptAssembler.java`
- Modify: `backend/src/main/java/fr/hkof/homeofficeexpenses/service/template/TemplateDataService.java`
- Modify: `backend/src/main/java/fr/hkof/homeofficeexpenses/web/AuthController.java` (or onboarding completion endpoint)
- Test: `backend/src/test/java/fr/hkof/homeofficeexpenses/web/SignatureControllerTest.java`
- Test: `backend/src/test/java/fr/hkof/homeofficeexpenses/service/LeaseServiceTest.java`
- Test: `backend/src/test/java/fr/hkof/homeofficeexpenses/service/RentReceiptServiceTest.java`

**Interfaces:**
- Consumes: `LeaseTenant`, updated `Person`, `Company`, `AppUser` entities.
- Produces: `PATCH /api/signatures/{id}` endpoint with `{ name: string }`; `POST /api/leases` accepting `tenantIds: number[]`; `POST /api/auth/onboarding-complete`; multi-tenant locataire string formatting in rent receipts.

- [ ] **Step 1: Write failing unit and web tests**
  - Test renaming a signature via `PATCH /api/signatures/{id}`.
  - Test creating a lease with 2 co-tenants and creating 2 distinct leases at the same address.
  - Test `TemplateDataService` combining multiple co-tenants into `locataire.nom` ("Alice DUPONT et Bob MARTIN").
- [ ] **Step 2: Run tests to verify failure**
  Run: `cd backend && ./mvnw -Dtest=SignatureControllerTest,LeaseServiceTest,RentReceiptServiceTest test`
  Expected: FAIL
- [ ] **Step 3: Implement contract and service changes**
  - Add `PATCH /api/signatures/{id}` to `openapi/openapi.yaml` and implement in `SignatureController` / `SignatureService`.
  - Update `LeaseRequest` in `openapi/openapi.yaml` to include `tenantIds: integer[]` and update `LeaseService.create()` / `update()`.
  - Update `RentReceiptAssembler` and `TemplateDataService` to format multi-tenant names and add `locataires` array to Mustache template context.
  - Add `POST /api/auth/onboarding-complete` setting `onboardingCompleted = true` on the current user.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `cd backend && ./mvnw -Dtest=SignatureControllerTest,LeaseServiceTest,RentReceiptServiceTest test`
  Expected: PASS
- [ ] **Step 5: Run full backend verification**
  Run: `cd backend && ./mvnw -B verify`
  Expected: PASS

---

### Task 3: Frontend Signature Studio Component (Ticket 88)

**Files:**
- Create: `frontend/src/components/settings/SignaturePadModal.tsx`
- Create: `frontend/src/components/settings/SignaturePadModal.css`
- Create: `frontend/src/components/settings/SignatureFontGenerator.tsx`
- Create: `frontend/src/components/settings/SignatureFontGenerator.css`
- Create: `frontend/src/components/settings/SignatureRenameModal.tsx`
- Create: `frontend/src/components/settings/SignatureStudio.tsx`
- Create: `frontend/src/components/settings/SignatureStudio.css`
- Create: `frontend/src/components/settings/SignaturePadModal.test.tsx`
- Create: `frontend/src/components/settings/SignatureFontGenerator.test.tsx`
- Create: `frontend/src/components/settings/SignatureStudio.test.tsx`
- Modify: `frontend/src/api/endpoints.ts`
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/components/settings/PersonSignatureSection.tsx`
- Modify: `frontend/src/i18n/resources/fr.json`

**Interfaces:**
- Consumes: `api.signatures.create`, `api.signatures.remove`, new `api.signatures.rename`.
- Produces: `<SignatureStudio personId={number} onSignatureAdded?: () => void />` component handling file upload, canvas drawing modal, cursive handwriting font preview generation, and list management.

- [ ] **Step 1: Write failing component tests**
  - Test drawing modal canvas interactions (drawing lines, clearing canvas, validating, rejecting empty canvas).
  - Test cursive font generation rendering 3 distinct typography styles and converting to image file blob.
  - Test renaming existing signature calling `api.signatures.rename`.
- [ ] **Step 2: Run tests to verify failure**
  Run: `cd frontend && npm test -- SignaturePadModal.test.tsx SignatureFontGenerator.test.tsx SignatureStudio.test.tsx`
  Expected: FAIL
- [ ] **Step 3: Implement Signature Studio components**
  - Implement `SignaturePadModal` with responsive canvas, pointer events (`pointerdown`, `pointermove`, `pointerup`), retina scaling (`devicePixelRatio`), and PNG export.
  - Implement `SignatureFontGenerator` rendering user names in cursive fonts (*Caveat*, *Dancing Script*, *Alex Brush*) with high contrast and canvas PNG conversion.
  - Implement `SignatureRenameModal` using `FormModal` and TanStack mutation for `api.signatures.rename`.
  - Assemble `SignatureStudio` tabs and connect to `PersonSignatureSection`.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `cd frontend && npm test -- SignaturePadModal.test.tsx SignatureFontGenerator.test.tsx SignatureStudio.test.tsx`
  Expected: PASS
- [ ] **Step 5: Run frontend lint, format, and coverage**
  Run: `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
  Expected: PASS

---

### Task 4: Frontend Onboarding Wizard (`/bienvenue`) (Ticket 89)

**Files:**
- Create: `frontend/src/pages/onboarding/OnboardingPage.tsx`
- Create: `frontend/src/pages/onboarding/OnboardingPage.css`
- Create: `frontend/src/pages/onboarding/OnboardingStepProfile.tsx`
- Create: `frontend/src/pages/onboarding/OnboardingStepProperty.tsx`
- Create: `frontend/src/pages/onboarding/OnboardingStepLease.tsx`
- Create: `frontend/src/pages/onboarding/OnboardingStepSummary.tsx`
- Create: `frontend/src/pages/onboarding/useOnboardingState.ts`
- Create: `frontend/src/pages/onboarding/OnboardingPage.test.tsx`
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/api/queries.ts`
- Modify: `frontend/src/i18n/resources/fr.json`

**Interfaces:**
- Consumes: `SignatureStudio`, `api.persons`, `api.companies`, `api.leases`, `api.auth.completeOnboarding`.
- Produces: `/bienvenue` route, onboarding stepper UI, SIREN/SIRET validation, router guard redirecting new users to `/bienvenue`.

- [ ] **Step 1: Write failing onboarding page and router tests**
  - Test redirect to `/bienvenue` when `user.onboardingCompleted === false`.
  - Test step navigation forward and backward.
  - Test validation rules: SIREN (9 digits) / SIRET (14 digits), phone format, landlord prefill, co-tenant addition.
  - Test completion redirects to generator.
- [ ] **Step 2: Run tests to verify failure**
  Run: `cd frontend && npm test -- OnboardingPage.test.tsx router.test.tsx`
  Expected: FAIL
- [ ] **Step 3: Implement Onboarding Wizard and Router Guard**
  - Build `useOnboardingState` managing form state across the 3 steps.
  - Build `OnboardingStepProfile` (name, address with residential note, phone, SIREN/SIRET, SignatureStudio).
  - Build `OnboardingStepProperty` (rental address, prefilled landlord details, email).
  - Build `OnboardingStepLease` (lease type: individual vs colocation, rent excl charges, charges, tenants list).
  - Build `OnboardingStepSummary` with validation review and submit action.
  - Update `RequireAuth` in `router.tsx` to redirect to `/bienvenue` if `user.onboardingCompleted === false` and route is not `/bienvenue`.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `cd frontend && npm test -- OnboardingPage.test.tsx router.test.tsx`
  Expected: PASS
- [ ] **Step 5: Run frontend verification gates**
  Run: `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
  Expected: PASS

---

### Task 5: End-to-End Onboarding & Colocation Spec (Ticket 90)

**Files:**
- Create: `frontend/cypress/e2e/07-onboarding.cy.ts`
- Modify: `backend/src/main/java/fr/hkof/homeofficeexpenses/service/E2eResetService.java`
- Modify: `.handoff/data-cy-mapping.md`

**Interfaces:**
- Consumes: Full stack onboarding wizard, multi-tenant receipt generation.
- Produces: Verified E2E test verifying registration -> onboarding wizard -> colocation receipt preview.

- [ ] **Step 1: Update E2E reset service and data-cy mappings**
  - Add reset endpoint support for an un-onboarded user account.
  - Record new `data-cy` attributes in `.handoff/data-cy-mapping.md`.
- [ ] **Step 2: Write Cypress E2E test in `07-onboarding.cy.ts`**
  - Register a new account.
  - Check automatic redirect to `/bienvenue`.
  - Fill Step 1 with profile, 14-digit SIRET, and draw a signature.
  - Fill Step 2 with rental property address and landlord email.
  - Fill Step 3 with a colocation lease having 2 co-tenants.
  - Submit and verify arrival on `/generer/quittance`.
  - Generate quittance and assert both co-tenants are listed on the PDF preview.
- [ ] **Step 3: Run E2E test against local stack**
  Run: `make e2e-up && make e2e 07-onboarding`
  Expected: PASS (all tests green).
- [ ] **Step 4: Diff coverage verification**
  Run: `scripts/diff-coverage.sh 0185fd5 all`
  Expected: Changed-line coverage >= 80%.

---

## Self-Review

1. **Spec Coverage**: All items from [docs/superpowers/specs/2026-10-31-new-user-onboarding-design.md](file:///home/thtran/Projects/hkof-solutions-accountant/docs/superpowers/specs/2026-10-31-new-user-onboarding-design.md) (welcome screen, profile, residential note, phone, SIREN/SIRET, signature upload/draw/generator/list, leasing address, landlord details, multiple tenants for both separate and colocation leases) are mapped to Tasks 1 through 5.
2. **Step Scan**: Every step contains exact files, commands, and expected results.
3. **Type Consistency**: DTO fields (`phone`, `addressNote`, `siret`, `tenantIds`, `onboardingCompleted`) and API routes are consistent across tasks.
4. **Review Focus**: Handled edge cases (locataire naming, SIRET length, empty canvas, redirect loop, address uniqueness) have explicit tests in their respective tasks.
5. **Proportion**: Document is compact and actionable.
