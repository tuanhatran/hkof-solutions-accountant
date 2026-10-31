# ONBOARDING IMPROVEMENTS & AGENCY DASHBOARD — Design & Work Plan

Date: 2026-10-31  
Status: DRAFT / READY FOR EXECUTION  
Spec: `docs/user_plan/improvement_onboard_new_user.md`  
Scope: Registration module selection, LMNP -> Agency terminology rename, Onboarding overhaul (Profile address autocomplete + country code, Multi-property landlord management, Individual vs colocation lease amounts), Agency Dashboard UI (/tableau-de-bord) via `ui-ux-pro-max`, and Cypress E2E verification.

---

## 1. Context & Business Domain Architecture

In real estate management (French property rental market):
- **Real Estate Agency ("Agence immobilière")**:
  - The agency manages multiple rental properties ("Biens immobiliers") on behalf of various landlords ("Propriétaires bailleurs").
  - The agency manager ("Gérant") represents the agency and oversees properties, leases, and receipts.
  - The agency is identified by its trade name ("Nom de l'agence") and optional legal information (SIRET/SIREN, legal form, address).
- **Landlords ("Bailleurs")**:
  - Property owners who contract with the agency. A landlord is distinct from the agency.
  - Each property is situated at a specific physical address and belongs to a specific landlord.
- **Properties ("Biens")**:
  - Physical dwellings/commercial spaces managed by the agency.
  - During onboarding, an agency can register one or multiple properties.
- **Leases ("Baux")**:
  - Attached to a specific property.
  - **Individual Lease ("Bail individuel")**: Each tenant signs their own contract and is responsible for their own distinct rent + charges amount.
  - **Solidary Colocation ("Colocation solidaire")**: Co-tenants share a single joint contract with a total collective rent + charges amount.
- **Agency Dashboard ("Tableau de bord de l'agence")**:
  - The primary landing hub for an agency user (`/tableau-de-bord`).
  - Displays key portfolio metrics (total properties, active leases, tenant count, monthly rental volume), quick generator shortcuts, and portfolio listings.
  - Designed with `ui-ux-pro-max` adhering to the soft Material design system (`docs/user_plan/ui_dashboard.md`).

---

## 2. Global Constraints & Project Principles

- **Language Policy**:
  - French for all user-facing UI, generated documents, toasts, forms, and validation error messages.
  - English for code identifiers, database entities, comments, documentation, and agent reports.
- **Terminology Shift**:
  - "LMNP" is renamed in the UI to **"Agence immobilière"** (or **"Agence"** for compact tabs/badges).
  - English counterpart: **"Real estate agency"** (or **"Agency"**).
  - Internal DB and route identifiers (`lmnpEnabled`, `/api/leases`, etc.) remain backward-compatible.
- **Monetary Authority**:
  - Backend authoritative calculations only via `CalculationService` (`BigDecimal`, `RoundingMode.HALF_UP`, scale 2). Never client-side authoritative calculation.
- **Address Autocomplete**:
  - Uses the official, free French government address API: `https://api-adresse.data.gouv.fr/search/?q={query}&limit=5`. No API key required, with graceful offline fallback.
- **Gate Suite**:
  - Changed-line coverage >= 80% (`scripts/diff-coverage.sh <Base> backend|frontend|all`).
  - Strict production class and component CSS length < 300 lines.
  - Cypress E2E run against running stack (`make e2e <spec>`).

---

## 3. Work Breakdown Structure (Tasks Sized <= 25 Files)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Task 91: Registration Module Selection & Agency Terminology Rename          │ (Size M - Full Stack)
│ - RegisterRequest module flags (companyEnabled, lmnpEnabled)                │
│ - Registration UI (/inscription) module selection cards with i18n           │
│ - Global rename: "LMNP" -> "Agence immobilière" across UI, nav and i18n     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Task 92: Onboarding Step 1 — Agency Profile, Phone Code & Address API       │ (Size M - Frontend)
│ - Title "Profil de l'agence", section "Gérant", section "Agence", "Nom"     │
│ - International phone input with country code selector                      │
│ - Postal address autocomplete via api-adresse.data.gouv.fr                  │
│ - Only Agency Name required; full i18n (fr + en)                            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Task 93: Onboarding Steps 2 & 3 — Properties & Leases Multi-Tenancy         │ (Size M - Frontend)
│ - Step 2 "Biens": Multi-property support with separate landlord details     │
│ - Step 3 "Baux": Property selector; individual vs colocation amounts        │
│ - Summary & finalization persistence of properties, landlords & leases      │
│ - Full i18n across wizard steps                                             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Task 94: Frontend Agency Dashboard (/tableau-de-bord)                       │ (Size M - Frontend)
│ - Soft Material UI via ui-ux-pro-max (Public Sans, #1C252E, 16px cards)      │
│ - Agency header, portfolio KPI cards, quick actions & overview tables       │
│ - Navigation & routing integration (AppNav, router, post-onboarding target) │
│ - Full i18n (fr + en)                                                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Task 95: Cypress E2E — Complete Onboarding & Agency Dashboard Flow          │ (Size M - E2E)
│ - End-to-end Cypress test (07-onboarding.cy.ts)                             │
│ - Fresh registration -> module selection -> 3 wizard steps -> Dashboard     │
│ - Verification of agency metrics and rent receipt generation                │
│ - Update data-cy-mapping.md with new testing hooks                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Task Specifications

### Task 91: SUBSCRIPTION-MODULES-AND-AGENCY-RENAME
- **Branch**: `feat/91-subscription-modules-and-agency-rename`
- **Base**: `cb098be`
- **Size**: M (Contract + Backend + Frontend)
- **Goal**: Allow users to select their module(s) upon registration with full i18n, and rename all user-facing references from "LMNP" to "Agence immobilière" / "Real estate agency" across the application.
- **Files**:
  - `openapi/openapi.yaml`
  - `backend/.../web/dto/AuthDtos.java`
  - `backend/.../service/AuthService.java`
  - `backend/.../test/.../AuthServiceTest.java`
  - `backend/.../test/.../AuthIntegrationTest.java`
  - `frontend/src/api/schema.ts` (regenerated via `npm run gen:api`)
  - `frontend/src/pages/auth/AuthPage.tsx`
  - `frontend/src/pages/auth/AuthPage.test.tsx`
  - `frontend/src/lib/validation.ts`
  - `frontend/src/components/layout/AppNav.tsx`
  - `frontend/src/components/layout/AppNav.test.tsx`
  - `frontend/src/pages/admin-users/AdminUsersPage.tsx`
  - `frontend/src/i18n/resources/{fr.ts,en.ts}`
- **Touched E2E**: `06-auth`

### Task 92: FRONTEND-ONBOARDING-PROFILE-ADDRESS-API
- **Branch**: `feat/92-frontend-onboarding-profile-address-api`
- **Base**: `feat/91-subscription-modules-and-agency-rename` head
- **Size**: M (Frontend)
- **Goal**: Update Onboarding Step 1: title "Profil de l'agence", subtitle "Gérant", country code selector for phone, French government address autocomplete, subtitle "Agence", field label "Nom", making only agency name required, with full i18n.
- **Files**:
  - `frontend/src/components/ui/AddressAutocomplete.tsx` (new)
  - `frontend/src/components/ui/AddressAutocomplete.test.tsx` (new)
  - `frontend/src/components/ui/CountryCodeSelect.tsx` (new)
  - `frontend/src/pages/onboarding/OnboardingStepProfile.tsx`
  - `frontend/src/pages/onboarding/useOnboardingState.ts`
  - `frontend/src/pages/onboarding/OnboardingPage.test.tsx`
  - `frontend/src/i18n/resources/{fr.ts,en.ts}`
- **Touched E2E**: `none`

### Task 93: FRONTEND-ONBOARDING-PROPERTIES-AND-LEASES
- **Branch**: `feat/93-frontend-onboarding-properties-and-leases`
- **Base**: `feat/92-frontend-onboarding-profile-address-api` head
- **Size**: M (Frontend)
- **Goal**: Overhaul Step 2 to "Biens" with multi-property and distinct landlord support (rent & charges removed), overhaul Step 3 "Baux" with property selector and individual vs colocation amounts, and update summary and finalization.
- **Files**:
  - `frontend/src/pages/onboarding/OnboardingStepProperty.tsx`
  - `frontend/src/pages/onboarding/OnboardingStepLease.tsx`
  - `frontend/src/pages/onboarding/OnboardingStepSummary.tsx`
  - `frontend/src/pages/onboarding/OnboardingPage.tsx`
  - `frontend/src/pages/onboarding/useOnboardingState.ts`
  - `frontend/src/pages/onboarding/OnboardingPage.test.tsx`
  - `frontend/src/i18n/resources/{fr.ts,en.ts}`
- **Touched E2E**: `none`

### Task 94: FRONTEND-AGENCY-DASHBOARD
- **Branch**: `feat/94-frontend-agency-dashboard`
- **Base**: `feat/93-frontend-onboarding-properties-and-leases` head
- **Size**: M (Frontend)
- **Goal**: Build the Agency Dashboard (`/tableau-de-bord`) using `ui-ux-pro-max` adhering to the soft Material design system, showing agency profile, KPI metrics, quick actions, and overview lists, integrated into navigation and router.
- **Files**:
  - `frontend/src/pages/dashboard/DashboardPage.tsx` (new)
  - `frontend/src/pages/dashboard/DashboardPage.css` (new)
  - `frontend/src/pages/dashboard/DashboardPage.test.tsx` (new)
  - `frontend/src/components/layout/AppNav.tsx`
  - `frontend/src/components/layout/AppNav.test.tsx`
  - `frontend/src/router.tsx`
  - `frontend/src/router.test.tsx`
  - `frontend/src/api/queries.ts`
  - `frontend/src/pages/onboarding/OnboardingPage.tsx`
  - `frontend/src/i18n/resources/{fr.ts,en.ts}`
- **Touched E2E**: `none`

### Task 95: E2E-ONBOARDING-AGENCY-AND-DASHBOARD
- **Branch**: `feat/95-e2e-onboarding-agency-and-dashboard`
- **Base**: `feat/94-frontend-agency-dashboard` head
- **Size**: M (E2E)
- **Goal**: Update Cypress E2E tests (`07-onboarding.cy.ts`) to validate the complete new onboarding workflow from registration module choice to Agency Dashboard inspection and rent receipt generation.
- **Files**:
  - `frontend/cypress/e2e/07-onboarding.cy.ts`
  - `frontend/cypress/support/helpers.ts`
  - `frontend/src/pages/onboarding/OnboardingStepProfile.tsx` (hooks only)
  - `frontend/src/pages/onboarding/OnboardingStepProperty.tsx` (hooks only)
  - `frontend/src/pages/onboarding/OnboardingStepLease.tsx` (hooks only)
  - `frontend/src/pages/dashboard/DashboardPage.tsx` (hooks only)
  - `.handoff/data-cy-mapping.md`
- **Touched E2E**: `07-onboarding`
