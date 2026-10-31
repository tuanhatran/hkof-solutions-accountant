# Auth & Onboarding Language Toggle, Personal Agency, Dedicated Backend Agency & Onboarding Resume Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide language toggling on auth and onboarding pages, establish a dedicated backend Agency entity and REST API (`/api/agency`) decoupled from the corporate company module, add a "Personal Agency" checkbox to Onboarding Step 1, support saving and resuming onboarding from a dashboard progress widget, and allow editing the agency profile in `/settings/agency`.

**Architecture:** Spring Boot 4 / Flyway V30 migration creating `agency` table with backfill for existing users, REST controller `/api/agency` protected under `LMNP_PREFIXES` in `ModuleAccessFilter`, updated OpenAPI contract, React 19 frontend integration with TanStack Query `useAgency()`, `LanguageSelector` on public/standalone pages, dynamic personal agency form toggle, user-scoped localStorage draft persistence with dashboard progress card and settings agency editor.

**Tech Stack:** Java 25, Spring Boot 4.x, PostgreSQL 17, Flyway, React 19, TypeScript strict, Vite, Tailwind CSS, TanStack Query, React Hook Form + Zod, Vitest, Cypress.

**Spec:** `docs/superpowers/specs/2026-10-31-auth-onboarding-language-and-personal-agency-design.md`

## Global Constraints

- User-facing strings in French by default; English in i18n resources (`fr.ts`, `en.ts`).
- Code, identifiers, comments, tests, and documentation in English.
- Real estate agency logic must NEVER call `/api/companies` or `useCompanies()`.
- `/api/agency` must be protected by `lmnpEnabled` (not `companyEnabled`).
- Changed-line test coverage >= 80% on backend and frontend via `scripts/diff-coverage.sh 4394181 all`.
- Every production class and component CSS must stay strictly under 300 lines.
- Base commit: `4394181` on branch `feat/97-auth-onboarding-language-and-personal-agency`.

## Review Focus

1. **Module Isolation**: Accounts with `companyEnabled = false, lmnpEnabled = true` can complete onboarding and view dashboard without any 403 `MODULE_COMPANY_DISABLED` error.
2. **Personal Agency Data Sanitization**: When Personal Agency is selected, SIREN/SIRET, legal form, and address are null/empty in the database and displayed cleanly on the dashboard without broken layout or missing placeholders.
3. **Onboarding Persistence & Resume**: Reloading or leaving `/welcome` retains all entered draft fields and active step in localStorage; clicking "Reprendre" on the dashboard restores the exact step.
4. **Settings Transition**: Editing the agency in `/settings/agency` successfully switches between Personal Agency and Professional Agency, validating corporate fields only when Personal Agency is unchecked.
5. **Language Switch Continuity**: Toggling language on `/login`, `/register`, or `/welcome` immediately updates all labels, retains user-entered input, and persists the choice across sessions.

---

### Task 97: BACKEND-AGENCY-ENTITY-AND-API

**Files:**
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
- `openapi/openapi.yaml`
- `frontend/src/api/schema.ts`
- `frontend/src/api/endpoints.ts`
- `frontend/src/api/queries.ts`
- `frontend/src/api/queries.test.ts`

- [ ] Write failing backend tests (`AgencyServiceTest.java`, `AgencyIntegrationTest.java`, `ModuleAccessIntegrationTest.java`).
- [ ] Create Flyway migration `V30__agency.sql` with table creation and backfill from `company`/`person`.
- [ ] Implement `Agency.java` entity, `AgencyRepository.java`, `AgencyDtos.java`, `AgencyService.java`, and `AgencyController.java`.
- [ ] Add `/api/agency` to `LMNP_PREFIXES` in `ModuleAccessFilter.java` and update `DataInitializer.java`.
- [ ] Update `openapi/openapi.yaml` with `/api/agency` paths, `AgencyDto`, and `AgencyRequest`.
- [ ] Regenerate frontend API types with `cd frontend && npm run gen:api`.
- [ ] Implement `api.agency.get()` and `api.agency.save()` in `endpoints.ts`, and `useAgency()` in `queries.ts`.
- [ ] Run `./mvnw -B verify` in `backend` and `npm run test` in `frontend` to confirm all tests pass.

---

### Task 98: FRONTEND-AUTH-ONBOARDING-LANGUAGE-AND-PERSONAL-AGENCY

**Files:**
- `frontend/src/pages/auth/AuthPage.tsx`
- `frontend/src/pages/auth/AuthPage.css`
- `frontend/src/pages/auth/AuthPage.test.tsx`
- `frontend/src/pages/onboarding/OnboardingStepProfile.tsx`
- `frontend/src/pages/onboarding/OnboardingPage.tsx`
- `frontend/src/pages/onboarding/useOnboardingState.ts`
- `frontend/src/pages/onboarding/OnboardingPage.test.tsx`
- `frontend/src/i18n/resources/fr.ts`
- `frontend/src/i18n/resources/en.ts`

- [ ] Write failing frontend tests for `AuthPage.test.tsx` (verifying `LanguageSelector` presence and language toggle) and `OnboardingPage.test.tsx` (verifying personal agency checkbox and corporate field removal).
- [ ] Add `LanguageSelector` to `AuthFrame` in `AuthPage.tsx` and style in `AuthPage.css`.
- [ ] Add `LanguageSelector` to `OnboardingPage` header.
- [ ] In `OnboardingStepProfile.tsx`, add the "Personal Agency" ("Agence personnelle") checkbox.
- [ ] Update `useOnboardingState.ts` and `profileSchema` to handle `isPersonalAgency` (boolean, default false), conditionally validating `legalForm`, `sirenSiret`, and `agencyAddress` only when false.
- [ ] In `OnboardingStepProfile.tsx`, conditionally hide the 3 corporate field groups when `isPersonalAgency` is checked.
- [ ] In `OnboardingPage.tsx`, remove `ensureAgency` and all calls to `api.companies.*`; save agency to `api.agency.save(...)` instead.
- [ ] Update French and English translations in `fr.ts` and `en.ts`.
- [ ] Run `npm run test` and `npm run lint` in `frontend` to confirm all tests pass.

---

### Task 99: FRONTEND-ONBOARDING-RESUME-AND-AGENCY-SETTINGS

**Files:**
- `frontend/src/pages/onboarding/useOnboardingPersistence.ts` (new helper)
- `frontend/src/pages/onboarding/OnboardingPage.tsx`
- `frontend/src/pages/onboarding/useOnboardingState.ts`
- `frontend/src/router.tsx`
- `frontend/src/router.test.tsx`
- `frontend/src/pages/dashboard/OnboardingProgressCard.tsx` (new component)
- `frontend/src/pages/dashboard/OnboardingProgressCard.css` (new CSS)
- `frontend/src/pages/dashboard/DashboardPage.tsx`
- `frontend/src/pages/dashboard/DashboardPage.test.tsx`
- `frontend/src/pages/settings/AgencySection.tsx` (new component)
- `frontend/src/pages/settings/AgencySection.css` (new CSS)
- `frontend/src/pages/settings/AgencySection.test.tsx` (new test)
- `frontend/src/pages/settings/LmnpPage.tsx`
- `frontend/src/pages/settings/LmnpPage.test.tsx`
- `frontend/src/i18n/resources/fr.ts`
- `frontend/src/i18n/resources/en.ts`

- [ ] Write failing tests for onboarding draft persistence, `OnboardingProgressCard`, `DashboardPage` without `useCompanies()`, and `AgencySection`.
- [ ] Implement `useOnboardingPersistence.ts` storing draft state in `localStorage` keyed by user ID.
- [ ] Add *"Passer au tableau de bord"* ("Skip to dashboard") button in `OnboardingPage.tsx`.
- [ ] Update `RequireAuth` in `router.tsx` to permit accessing the app once bypassed.
- [ ] Build `OnboardingProgressCard.tsx` displaying completed/remaining onboarding steps and a *"Reprendre l'inscription"* button.
- [ ] Update `DashboardPage.tsx` to display `OnboardingProgressCard` when `onboardingCompleted` is false, and replace `useCompanies()` with `useAgency()`.
- [ ] In `LmnpPage.tsx`, add the "Agence" tab.
- [ ] Build `AgencySection.tsx` allowing users to edit agency profile and toggle between Personal Agency and Professional Agency, saving via `PUT /api/agency`.
- [ ] Add all necessary i18n keys to `fr.ts` and `en.ts`.
- [ ] Run `npm run test:coverage` and verify component sizes stay < 300 lines.

---

### Task 100: E2E-ONBOARDING-PERSONAL-AGENCY-AND-RESUME

**Files:**
- `frontend/cypress/e2e/07-onboarding.cy.ts`
- `frontend/cypress/support/helpers.ts`
- `.handoff/data-cy-mapping.md`

- [ ] Update `07-onboarding.cy.ts` to test:
  - Language toggle on `/login` and `/welcome`.
  - Registration with only the Agency module (`companyEnabled = false, lmnpEnabled = true`).
  - Personal Agency onboarding flow (verifying no `/api/companies` call, no 403 error).
  - Skipping to dashboard, inspecting `OnboardingProgressCard`, and clicking resume.
  - Finalizing onboarding and editing agency in `/settings/agency` from Personal to Professional.
- [ ] Update `.handoff/data-cy-mapping.md` with new test hooks.
- [ ] Run `make e2e 07-onboarding` against the running test stack.
