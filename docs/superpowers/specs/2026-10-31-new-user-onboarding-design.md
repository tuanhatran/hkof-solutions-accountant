# New User Onboarding & Multi-Tenant Leases Specification

Date: 2026-10-31 · Status: Draft for User Approval · Scope: Full stack (DB migration, backend domain & services, OpenAPI contract, frontend wizard, signature studio, templates, E2E).

---

## 1. Intent and Why

When a newly registered user signs in for the first time, their account has no data (no profile, no companies, no leases, no signatures). Rather than landing on an empty generation screen with disabled actions, the application should present a welcoming, guided 3-step onboarding wizard (`/bienvenue`) that establishes:
1. The user's personal identity, agency details (SIREN or 14-digit SIRET), and visual signature (via upload, drawing pad modal, or typography generator).
2. A rental property address and landlord identity.
3. The lease structure and its tenant(s), supporting both **individual separate leases** at the same address and **joint colocation leases** (*bail unique solidaire*) with multiple co-tenants.

---

## 2. Goals

- **Onboarding Flow**:
  - Automatically redirect newly authenticated users with `onboardingCompleted == false` to `/bienvenue`.
  - Provide a clean 3-step wizard with visual progress, breadcrumb stepper, and validation.
- **Section 1: Profile & Agency & Signature**:
  - Personal profile: First name, last name, personal address (with optional residential note/complement), telephone.
  - Agency profile: SIREN (9 digits) or SIRET (14 digits: 9 digits + 5-digit NIC, e.g. `00009`–`00037`).
  - Signature Studio:
    - Upload an existing image file (PNG/JPEG).
    - Draw a signature in a modal using an HTML5 Canvas with pointer/touch support, stroke smoothing, and clear/confirm actions.
    - Generate signature suggestions from First Name + Last Name using elegant cursive handwriting typography styles rendered to image canvas.
    - Manage existing signatures: display thumbnail, title, rename via PATCH endpoint, delete with confirmation.
- **Section 2: Leasing Property & Landlord**:
  - Property address (adresse du bien loué).
  - Landlord details: pre-populated from the user profile created in Step 1, with email and optional customization.
- **Section 3: Leases & Multi-Tenants**:
  - Support adding multiple tenants per property address:
    - Multiple separate leases at the same address (individual leases per room).
    - A joint colocation lease with multiple co-tenants linked to a single contract.
  - Tenant details: first name, last name, personal address, phone, email.
- **Database & Architecture**:
  - Flyway migration `V29__multi_tenant_leases_and_user_profile.sql`:
    - Add `phone VARCHAR(30)` and `address_note VARCHAR(500)` to `person`.
    - Add `siret VARCHAR(14)` to `company`.
    - Add `onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE` to `app_user`.
    - Create `lease_tenant` join table `(id BIGSERIAL, lease_id BIGINT, person_id BIGINT, is_primary BOOLEAN, created_at TIMESTAMPTZ)`.
    - Backfill existing single-tenant leases into `lease_tenant`.
    - Update unique constraint so multiple co-tenants can belong to one lease, and multiple leases can share the same `address_id`.
  - Update `openapi/openapi.yaml` contract accordingly.
  - Colocation rent receipt formatting: displays all co-tenants on quittances (e.g. *"Alice DUPONT et Bob MARTIN"* in `locataire.nom` and exposes `locataires` list in template data).

---

## 3. Non-Goals

- Modifying existing accounting/pro-rata calculation formulas (`CalculationService` remains strictly untouched).
- Changing password or authentication token mechanics (handled by existing auth module).
- External third-party digital signature cryptographic certification (e.g., DocuSign/Yousign); signatures remain local image stamps for PDF templates.

---

## 4. Anti-Goals

- Breaking existing single-tenant leases or historical generated rent receipts.
- Blocking users from modifying their profile, leases, or signatures later in `/configuration` pages.
- Forcing client-side authoritative calculations for rent or charges.
- Any production class or component exceeding 300 lines.

---

## 5. Constraints

- **Language**: Code, documentation, identifiers in English; all user-facing UI labels, toasts, and validation errors in French.
- **Currency & Dates**: Amounts in Euros (`€`), dates in French format `DD/MM/YYYY`.
- **Validation**: SIREN strictly 9 digits, SIRET strictly 14 digits (or 9 digits + 5 digits). Phone number format validated with French / international standard regex.
- **Coverage**: Changed-line test coverage >= 80% for backend and frontend code.
- **Quality**: Prettier formatted, ESLint clean, no TypeScript `any`.

---

## 6. Approaches Considered

1. **Approach 1 (Selected)**: Dedicated `lease_tenant` join table + global property address sharing + `phone`/`siret`/`onboarding_completed` columns. Clean relational schema supporting both distinct leases and joint colocation leases.
2. **Approach 2**: Retaining `tenant_id` on `lease` and adding a secondary `lease_co_tenant` table. Rejected: creates dual sources of truth and fragile queries.
3. **Approach 3**: 1-to-1 leases with a "colocation group" ID. Rejected: fails to model a single French solidary colocation lease with shared total rent and a unified quittance.

---

## 7. Detailed Component & UI/UX Design (`ui-ux-pro-max`)

### 7.1 Stepper Navigation (`/bienvenue`)
- Visual horizontal stepper at the top with steps:
  1. *1. Profil & Signature*
  2. *2. Bien & Bailleur*
  3. *3. Bail & Locataires*
  4. *4. Récapitulatif & Finalisation*
- Accessible keyboard navigation (`role="tablist"` or numbered list with `aria-current="step"`).
- Back button to review/modify previous steps; Next button validated before advancing.

### 7.2 Signature Studio
- Tabbed interface within Step 1:
  - **Importer**: File dropzone / file picker accepting PNG/JPEG (< 2MB), instant preview.
  - **Dessiner**: Modal with an HTML5 `<canvas>`, responsive `devicePixelRatio` scaling, pointer events (`pointerdown`, `pointermove`, `pointerup`), stroke thickness (2px), "Effacer" button, and "Valider le tracé" producing a trimmed transparent PNG blob.
  - **Générer**: Live preview cards rendering the user's First Name + Last Name in 3 curated handwriting cursive fonts (e.g. *Caveat*, *Dancing Script*, *Alex Brush*). Clicking a style renders to canvas and converts to PNG blob.
- Signature management card: list of saved signatures for the person with thumbnail, name, edit button (opens rename dialog using `PATCH /api/signatures/{id}`), and delete button with `ConfirmDialog`.

### 7.3 Multi-Tenant Lease Configuration (Step 3)
- Radio card selector:
  - **Bail individuel**: One tenant per contract (useful for room rentals).
  - **Bail de colocation solidaire**: Multiple co-tenants sharing the same contract and rent receipt.
- "Ajouter un colocataire" button adding tenant rows with inline validation.

---

## 8. Handoff Tickets Breakdown (`.handoff/tasks/`)

We structure this work into 5 focused, sequential tickets adhering to repository size rules (each <= 25 files, M size):

1. **`86 - MIGRATION-MULTI-TENANT-PROFILE-SIRET.md` (Size: M)**
   - Flyway migration `V29__multi_tenant_leases_and_user_profile.sql`.
   - Update `Person`, `Company`, `AppUser`, and `Lease` JPA entities.
   - Introduce `LeaseTenant` entity and `LeaseTenantRepository`.
   - Unit & migration integration tests.

2. **`87 - BACKEND-MULTI-TENANT-SIGNATURE-RENAME.md` (Size: M)**
   - Update `openapi/openapi.yaml` contract for leases, persons, companies, signatures (PATCH rename), and current user onboarding status.
   - Implement `PATCH /api/signatures/{id}` endpoint and service.
   - Update `LeaseService` to support multiple tenants per lease and multiple leases per address.
   - Update `RentReceiptService` and `TemplateDataService` to format multi-tenant names on receipts.
   - Backend unit & integration tests.

3. **`88 - FRONTEND-SIGNATURE-STUDIO.md` (Size: M)**
   - Reusable `SignatureStudio` component with:
     - Upload tab.
     - `SignaturePadModal` (canvas drawing pad with touch/mouse support).
     - `SignatureFontGenerator` (cursive handwriting suggestions).
     - Rename dialog and signature listing.
   - Update `PersonSignatureSection.tsx` and export for onboarding wizard.
   - Vitest component tests.

4. **`89 - FRONTEND-ONBOARDING-WIZARD.md` (Size: M)**
   - Create `/bienvenue` page with 3-step wizard and summary.
   - Form steps for Profile & Agency (SIREN/SIRET validation), Property & Landlord, and Lease & Multi-Tenants.
   - Update router with onboarding redirect guard in `RequireAuth`.
   - API client methods and TanStack query mutations.
   - Vitest page and step tests.

5. **`90 - E2E-ONBOARDING-AND-COLOCATION.md` (Size: M)**
   - Cypress E2E test `07-onboarding.cy.ts`:
     - Register a fresh user.
     - Redirected to `/bienvenue`.
     - Complete Step 1 (Profile, SIRET, Draw signature).
     - Complete Step 2 (Property address, Landlord).
     - Complete Step 3 (Colocation lease with 2 co-tenants).
     - Finalize and verify redirection to receipt generation with prefilled colocation data.
     - Generate quittance and assert both co-tenants are present on the preview/receipt.
