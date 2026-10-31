# COMPANY ONBOARDING & LANDLORD/TENANT SEPARATION — Architecture & Plan

Date: 2026-10-31  
Status: DRAFT / READY FOR EXECUTION  
Spec: `docs/user_plan/onboard_company.md`  
Scope: Navigation "Administration" rename, Onboarding skip button relocation to step actions, Real Estate Agency "People" separation into "Landlord" & "Tenant" (database, API & UI), Company Onboarding Wizard (Identity, Lease, Expenses, Employees, Summary) with soft Material UI (`ui-ux-pro-max`), and Cypress E2E verification.

---

## 1. Context & Business Domain Architecture

### A. Navigation & Usability Refinements
1. **Sidebar Navigation**:
   - The settings group title (`navigation.sections.settings`) in `AppNav.tsx` is renamed from "Réglages" / "Settings" to **"Administration"** in both French and English.
2. **Onboarding Skip Button**:
   - The skip onboarding button (`data-cy="btn-skip-onboarding"`) is relocated from the top header next to the language selector down into the primary step action footer (`.onboarding-actions`) on each step.
   - Clicking it saves current draft state to session/local storage, marks onboarding skipped, and redirects the user to their designated home path (`/dashboard` for agency, `/generate/expense-statement` for company).

### B. Landlord & Tenant Separation (Real Estate Agency)
In real estate rental management, mixing landlords and tenants under a generic "People" table creates confusion in data modeling and user experience:
1. **Landlord ("Bailleur")**:
   - The property owner represented on the lease.
   - Possesses a name, postal address, phone, optional "Fait à" issue place (`issuePlace`), and associated signatures.
2. **Tenant ("Locataire")**:
   - Natural person renting a property under a lease.
   - Possesses a name, address, phone, contact email, and free-form notes.
3. **Data Model**:
   - The backend `person` table uses Single Table Inheritance with discriminator column `kind` (`LANDLORD`, `TENANT`, `EMPLOYEE`, `PERSON`).
   - Flyway migration `V31__separate_landlord_tenant.sql` backfills existing person records according to their lease linkage:
     - Linked to `lease.landlord_id` or carrying signatures -> `LANDLORD`.
     - Linked to `lease.tenant_id` or `lease_tenant.person_id` -> `TENANT`.
     - Unlinked records default to `LANDLORD`.
   - Dedicated REST APIs `/api/landlords` and `/api/tenants` are exposed in `openapi/openapi.yaml`, while maintaining backward-compatible `/api/persons`.
4. **UI Separation**:
   - In `/settings/agency` (`LmnpPage.tsx`), the single "Personnes" tab is replaced with two distinct tabs:
     - **"Bailleurs"** (`LandlordsSection.tsx`): Landlord list, sort, search, add/edit modal, signatures.
     - **"Locataires"** (`TenantsSection.tsx`): Tenant list, sort, search, add/edit modal, email.
   - In lease forms (`LeaseFormModal.tsx`), landlord selection is restricted to landlords, and tenant selection is restricted to tenants.

### C. Company Onboarding Wizard ("Onboarding Entreprise")
For users registering with the company module (`companyEnabled = true`), a comprehensive multi-step onboarding wizard at `/welcome` guides them to establish their corporate entity:
1. **Step 1: Company Profile ("Profil de l'entreprise")**:
   - Company Name (`name`, required).
   - Legal form (`legalForm`, e.g. SAS, SARL, SASU, EURL, SCI).
   - SIREN / SIRET with autocomplete / lookup (`/api/companies/lookup?siren=...`).
   - Registered address with French government address API autocomplete (`https://api-adresse.data.gouv.fr/search/?q={query}&limit=5`).
   - Share capital, RCS city, VAT number, manager contact.
2. **Step 2: Company Lease ("Bail de l'entreprise")**:
   - Property dwelling address where business activity takes place.
   - Surface areas: Total area (`totalArea`) and business area (`businessArea`) to preview the occupational pro-rata percentage.
   - Rent excl. charges (`rentExclCharges`) and charges (`charges`).
   - Landlord details (name, address).
3. **Step 3: Company Expenses ("Postes de dépenses")**:
   - Pre-populated standard expense categories (Loyer, Électricité, Gaz / Chauffage, Internet & Téléphonie, Assurance habitation).
   - Toggle selection and custom deductible rate adjustments.
4. **Step 4: Company Employees ("Salariés")**:
   - Manager / employee details: First name, Last name, Email, Title (Gérant, Dirigeant, Salarié).
   - Pre-populated initial manager row using current user profile.
5. **Step 5: Summary & Finalization ("Récapitulatif")**:
   - Visual breakdown of Company identity, Lease, Expense categories, and Employees.
   - "Finaliser la configuration": Executes chained creation via `api.companies.create`, `api.leases.create`, `api.expenseItems.create`, `api.employees.create`, marks `completeOnboardingSession()`, and redirects to `/generate/expense-statement`.

---

## 2. Global Constraints & Project Principles

- **Language Policy**:
  - UI, generated documents, toasts, forms, and validation messages in **French**.
  - Identifiers, entities, database tables, comments, documentation in **English**.
  - Bilingual localization (`fr.ts`, `en.ts`) for all UI texts.
- **Monetary Authority**:
  - Backend `CalculationService` (`BigDecimal`, `RoundingMode.HALF_UP`, scale 2) only. Never client-side authoritative calculation.
- **Visual Design**:
  - Soft Material design system (`ui-ux-pro-max`): clean borders, subtle shadows, `#1C252E` text, balanced hierarchy.
- **File Length & Turn Budget**:
  - Strict limit: all classes, components, and CSS files < 300 lines.
  - Tasks split so none touches more than 25 files (Size M) or 15 files (Size S).

---

## 3. Work Breakdown Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Task 101: Sidebar "Administration" Rename & Onboarding Skip Relocation      │ (Size M - Frontend)
│ - Rename "navigation.sections.settings" to "Administration" (fr + en)       │
│ - Relocate skip onboarding button from header to step action footer         │
│ - Update AppNav.test.tsx and OnboardingPage.test.tsx                        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Task 102: Backend Separation of Landlord & Tenant Model & APIs              │ (Size L - Backend & Contract)
│ - V31__separate_landlord_tenant.sql (discriminator backfill + email column) │
│ - Landlord & Tenant domain entities, repositories, and services             │
│ - OpenAPI contract: /api/landlords and /api/tenants with DTOs and schemas   │
│ - Unit and integration tests for Landlord and Tenant operations             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Task 103: Frontend Agency Settings Split: Landlords & Tenants Tabs          │ (Size M - Frontend)
│ - Regenerate schema.ts and expose api.landlords, api.tenants, and queries   │
│ - Replace "Personnes" tab with "Bailleurs" and "Locataires" in LmnpPage     │
│ - Separate LandlordForm and TenantForm with signatures & contact details    │
│ - Filter lease landlord and tenant selector dropdowns accordingly           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Task 104: Frontend Company Onboarding Wizard Steps                          │ (Size M - Frontend)
│ - Company onboarding state machine & persistence hooks                      │
│ - Module branching in OnboardingPage (Company track vs Agency track)        │
│ - 5 wizard steps: Identity, Lease, Expenses, Employees, Summary             │
│ - SIREN lookup + French address autocomplete integration                    │
│ - Atomic finalization chained creation & redirect to expense statement      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Task 105: Cypress E2E — Company Onboarding Flow & Verification              │ (Size S - E2E)
│ - E2E Cypress test (08-company-onboarding.cy.ts / 07-onboarding.cy.ts)      │
│ - Fresh user registration with company module -> Complete 5 wizard steps    │
│ - Verify redirect to /generate/expense-statement with active lease & items  │
│ - Verify skip and resume flow for company onboarding                        │
│ - Update data-cy-mapping.md                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```
