# 26 — LMNP-PERSONS — design and work plan

Status: TODO
Branch: `feat/lmnp-persons`
Size: L
Round: 0/2
Task handoff: `.handoff/tasks/26 - LMNP-PERSONS.md`

This file is portable across `.qoder/agents/`, `.opencode/agents/` and
`.github/agents/`. The same `.handoff/` tree is shared. Do not commit or push.

## Why

Today the Configuration page is a single screen with a segmented control
`Entreprise / Quittances`:

- `Entreprise` contains companies, their employees and their expense items.
- `Quittances` contains Bailleurs, Locataires, Baux et adresses and a separate
  Signatures card.
- `Landlord` and `Tenant` are separate tables, separate ids and separate CRUD.
- `Signature` carries a `SignatureType` (`LANDLORD`, `ENTREPRISE_CEO`,
  `EMPLOYEE`) plus `landlordId`, `employeeId`, `companyId`; a tenant cannot own
  a signature.
- A lease always has one `Tenant` person, even when the "bail société" flag is
  set; the company link (`lease.company_id`) is edited from the company form
  and supplies the pro-rata surfaces.
- The rent-receipt page filters signatures by `type = LANDLORD`; the expense
  statement page uses the company/CEO signature.
- Employees are not persons in the model, even though they carry signatures.

The target: move the two settings entries into the sidebar under
`Configuration`, rename `Quittances` to `LMNP`, make LMNP a page with
`Baux et adresses` and `Personnes`, merge landlords and tenants into one
`Person` model, make `Employee` a `Person` subtype, split lease parties by
lease type, and move signature management into the add/edit forms.

## Goals

- Sidebar: `Réglages > Configuration` becomes a group with `Entreprise` and
  `LMNP`; `Templates` and `Admin IA` stay at the `Réglages` level.
- `/configuration` redirects to `/configuration/entreprise` for old links,
  bookmarks and E2E helpers.
- `/configuration/lmnp` has two segmented tabs: `Baux et adresses` (default)
  then `Personnes`.
- `Personnes` lists natural persons only. Employees stay exclusively in
  `Entreprise`, where they are added, edited, deleted and given signatures.
- One `Person` entity for every natural person; `Employee` is a `Person`
  subtype with a company, first/last name, email, title and an optional
  address. There is no landlord/tenant kind.
- One or more signatures per person, logically deleted; no `SignatureType`.
- Lease parties:
  - enterprise lease (`companyLease = true`): landlord is a natural person,
    tenant is a company (`companyId` required);
  - normal lease (`companyLease = false`): landlord and tenant are natural
    persons (`tenantId` required);
  - employees are never selectable as a lease party.
- Signatures are managed inside the person/employee add/edit form. The separate
  Signatures card, its form and its type selector disappear.
- Rent receipt signature picker lists the signatures of the selected landlord
  person. Expense statement picker lists the signatures of the company CEO.
- Contract first, then backend, then generated frontend types, then UI.

## Non-goals

- No change to `CalculationService`, totals, rounding or money rules.
- No change to the PDF layout, template sandbox or document wording: the
  `bailleur` / `locataire` keys keep their names.
- No new lease document; no tenant signature printed.
- No RBAC or authentication.
- No change to the LLM path or secrets.
- No UI text outside French; code stays English.
- No commit, push, reset, clean, stash or worktree.

## Decisions (user answers + my calls — correct before W1)

- **D1 — one `Person` for landlords and tenants.** `person` is a single table
  with JPA `SINGLE_TABLE` inheritance. Root `Person` is concrete (discriminator
  `PERSON`); `Employee extends Person` (discriminator `EMPLOYEE`). There is no
  `LANDLORD`/`TENANT` discriminator: any natural person can be the landlord or
  the tenant of any normal lease. A lease rejects the same person on both
  sides. If a human is both landlord and tenant in different leases, the same
  person row is reused.
- **D2 — Employee inherits Person.** `Person` supplies id, `name` (required for
  a natural person, null for an employee), `address` (optional for every
  person), deleted and timestamps. `Employee` adds `companyId`, `firstName`,
  `lastName`, `email`, `title`. Employee CRUD stays in Entreprise; Personnes
  never lists employees.
- **D3 — signatures belong to one person.** `Signature` gets `personId` and
  loses `type`, `landlordId`, `employeeId`, `companyId`. A person can have
  several non-deleted signatures (versions). Logical deletion only.
- **D4 — lease parties by type.** `lease.companyLease = true`: `tenant_id` is
  null and `company_id` (the existing link, required) is the tenant company.
  `lease.companyLease = false`: `tenant_id` is a natural person; `company_id`
  remains the optional pro-rata link edited from the company form. The service
  enforces both shapes and rejects employees. Surfaces stay required only for
  an enterprise lease.
- **D5 — rent receipt tenant mirrors the lease.** A receipt of an enterprise
  lease has a company tenant (`tenant_company_id`); a receipt of a normal lease
  has a person tenant (`tenant_id`). Exactly one is set. The template still
  receives `locataire.nom` / `locataire.adresse`, resolved from the person or
  the company. The document identity company is the lease's linked company
  when set, otherwise the request `companyId`/active company.
- **D6 — document signature rules.** Rent receipt: a signature of the lease
  landlord person. Expense statement: a signature of the CEO employee of the
  active company. The backend validates that the requested signature belongs to
  that person. No fallback to another person. Tenant signatures are stored but
  never printed.
- **D7 — migration preserves references.** Persons get new ids from one
  sequence; mapping tables remap `lease`, `rent_receipt` and `signature`
  references before the old tables/columns are dropped.
- **D8 — legacy unlinked landlord signatures.** A legacy `LANDLORD` signature
  with no `landlord_id` is linked to the only non-deleted natural person when
  exactly one exists; otherwise it is logically deleted and the report says so.
  No signature is physically deleted.
- **D9 — deletion rules.** A person used by an active lease as landlord or
  tenant cannot be deleted. A person with a non-deleted signature cannot be
  deleted; remove the signatures first from the person form. An employee keeps
  the same signature rule. A company used as the tenant of an active enterprise
  lease follows the existing company deletion rule (business exception while
  data exists). Logical deletion only.
- **D10 — contract first.** Change `openapi/openapi.yaml`, run
  `npm run gen:api`, never edit `frontend/src/api/schema.ts` by hand.
- **D11 — UI naming.** The second LMNP tab is **Personnes**. No kind badge is
  needed because only natural persons are listed. The enterprise-lease tenant
  select is labelled "Locataire (société)"; the normal-lease selects are
  "Bailleur" and "Locataire".
- **D12 — signatures after create.** The person/employee modal creates the row,
  switches to an edit state with the saved id, and shows the signature section
  without closing. Editing exposes existing signatures. Closing is explicit.

## Data model

### `person`

```
id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
kind VARCHAR(20) NOT NULL,              -- discriminator: PERSON | EMPLOYEE
name VARCHAR(255),                      -- natural person; null for employee
address VARCHAR(500),                   -- optional for every person
company_id BIGINT REFERENCES company(id), -- employee only
first_name VARCHAR(255),                -- employee only
last_name VARCHAR(255),                 -- employee only
email VARCHAR(255),                     -- employee only
title VARCHAR(20),                      -- employee only
deleted BOOLEAN NOT NULL DEFAULT FALSE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ
```

- Partial unique index `(company_id, lower(email)) WHERE kind = 'EMPLOYEE'
  AND email IS NOT NULL AND deleted = FALSE`.
- Indexes `(kind, deleted, name)` and `(company_id, deleted)`.
- Check constraint:
  - `PERSON`: `name IS NOT NULL`; employee columns null.
  - `EMPLOYEE`: `company_id`, `first_name`, `last_name`, `title` not null;
    `name` null.
- `PersonRepository`: natural-person queries use
  `@Query("select p from Person p where p.deleted = false and type(p) = Person ...")`.
  `EmployeeRepository` keeps its derived queries and stays discriminator-scoped.

### `signature` (altered)

```
person_id BIGINT REFERENCES person(id), -- nullable only for logically deleted legacy rows
name, mime_type, file_name, image, deleted, created_at, updated_at
```

- Drop `type`, `landlord_id`, `employee_id`, `company_id`.
- Drop `ix_signature_deleted_type`, `ix_signature_landlord` and the V7 check
  constraint; add `(person_id, deleted)`.
- Queries: `findAllByPersonIdAndDeletedFalseOrderByNameAscIdAsc`,
  `findFirstByPersonIdAndDeletedFalseOrderByNameAscIdAsc`,
  `existsByPersonIdAndDeletedFalse`, `findAllByPersonIdInAndDeletedFalse`.

### `lease` (altered)

- `landlord_id` and `tenant_id` reference `person(id)`; `tenant_id` nullable.
- `company_id` stays the company link; required when `company_lease = true`
  (tenant company), optional for a normal lease.
- Check: `(company_lease AND tenant_id IS NULL AND company_id IS NOT NULL) OR
  (NOT company_lease AND tenant_id IS NOT NULL)`.
- Unique active indexes:
  - normal: `(landlord_id, tenant_id) WHERE NOT deleted AND NOT company_lease`;
  - enterprise: `(landlord_id, company_id) WHERE NOT deleted AND company_lease`.
- Service validates `landlord` is a natural person, `tenant` is a natural
  person, landlord ≠ tenant, and the company tenant is not deleted.
- `lease.company_id` keeps its existing "one company, one lease" rule from
  `CompanyService.linkLease`.

### `rent_receipt` (altered)

- `landlord_id` references `person(id)` (nullable for legacy history).
- `tenant_id` references `person(id)`, nullable; add nullable
  `tenant_company_id` referencing `company(id)`.
- Check exactly one of `tenant_id` / `tenant_company_id` for new rows.
- Version uniqueness per pair: replace `uq_rent_receipt_month_pair_version`
  with an expression index on
  `(billing_month, landlord_id, COALESCE(tenant_id, 0),
  COALESCE(tenant_company_id, 0), version)`.
- `company_id` stays the document/identity company.

## Migration V10

1. Create `person` with the shape above.
2. Create mapping tables `landlord_person_map(old_id, new_id)`,
   `tenant_person_map(old_id, new_id)` and `employee_person_map(old_id, new_id)`.
   Allocate ids from `pg_get_serial_sequence('person','id')`, insert persons with
   explicit ids, preserving `deleted`, `created_at`/`updated_at`, names,
   addresses and employee fields. Do not deduplicate landlord/tenant rows.
3. Add `signature.person_id`; backfill from `landlord_id`, `employee_id`.
   Remaining `type = 'LANDLORD'` rows with no owner: link to the only
   non-deleted natural person when exactly one exists, otherwise set
   `deleted = true`. Any remaining null owner is logically deleted.
4. Drop the signature old columns, indexes and check constraint; add
   `(person_id, deleted)`.
5. Remap `lease.landlord_id` through `landlord_person_map`. For
   `company_lease = true`, set `tenant_id = NULL` and keep `company_id` as the
   tenant company (V7 backfilled it); if `company_id` is null, fall back to a
   normal lease with the mapped tenant. For `company_lease = false`, map
   `tenant_id` through `tenant_person_map`. Drop old FKs/columns, rename, add
   the new FKs, check, and the two partial unique indexes.
6. Remap `rent_receipt.landlord_id`. When the receipt's old pair matches a
   `company_lease = true` lease, set `tenant_company_id` from that lease and
   `tenant_id = NULL`; otherwise map `tenant_id` through `tenant_person_map`.
   Add the check and the expression unique index.
7. Drop `landlord`, `tenant` and `employee` tables and their indexes.
8. `setval` the `person` sequence; add a Postgres migration test proving the
   normal lease, the enterprise lease, the receipts and the legacy rule.

## Contract (`openapi/openapi.yaml`)

- Remove `/api/landlords` and `/api/tenants` (all methods).
- Add `/api/persons`:
  - `GET /api/persons` → natural persons only (`PersonDto[]`).
  - `POST /api/persons` → `PersonDto` (201).
  - `PUT /api/persons/{id}` → `PersonDto`.
  - `DELETE /api/persons/{id}` → 204.
- `PersonRequest`: `name` (required), `address` (nullable).
- `PersonDto`: `id`, `name`, `address`, `signatureCount` (readOnly).
- `EmployeeRequest` / `EmployeeDto`: add nullable `address`; add readOnly
  `signatureCount` to `EmployeeDto`.
- `LeaseRequest`: add nullable `companyId` (the tenant company of an enterprise
  lease); `tenantId` becomes nullable; document the two shapes and the
  employees exclusion.
- `LeaseDto`: `tenantId` nullable; `companyId`/`companyName` describe the
  enterprise tenant or the normal pro-rata link; `tenantName` is the person or
  company name.
- `RentReceiptRequest`: `landlordId` required; `tenantId` and `tenantCompanyId`
  nullable with exactly one required; `companyId` remains optional.
- `RentReceiptDto`: `tenantId` nullable; add `tenantCompanyId`;
  `tenantName` resolves to the person or company.
- `SignatureDto`: remove `type`, `landlordId`, `landlordName`, `employeeId`,
  `employeeName`, `companyId`, `companyName`; add `personId`, `personName`.
- `GET /api/signatures` requires `personId`; remove the `companyId`/`employeeId`
  filters. `POST /api/signatures` multipart requires `personId`, `name`, `file`;
  remove `type`, `landlordId`, `employeeId`.
- Regenerate `frontend/src/api/schema.ts`; remove the `SignatureType` alias from
  `frontend/src/api/types.ts`.

## Backend

- Domain: add `Person` (root, single table); convert `Employee` to a `Person`
  subclass with optional address; delete `Landlord`, `Tenant`, `SignatureType`;
  `Signature.personId`; `Lease` references `Person` plus the nullable tenant;
  `RentReceipt.tenantCompanyId`.
- Repository: add `PersonRepository`; delete `LandlordRepository` and
  `TenantRepository`; keep `EmployeeRepository`; update `SignatureRepository`,
  `LeaseRepository`, `RentReceiptRepository` and `CompanyRepository` callers.
- Service:
  - `PersonService` (`list()`, `create`, `update`, `delete`, `entity`,
    `entities(ids)`, signature count) and a thin `PersonController`.
  - `LeaseService` (rename `RentConfigurationService`) for leases only, with
    the party validation above; thin `LeaseController` replacing
    `RentConfigurationController`. Split if it approaches 300 lines.
  - `EmployeeService`: Person inheritance, optional address, signature check by
    `personId`, signature count.
  - `SignatureService`: `list(personId)`, `create(personId, name, file)`,
    `resolveForLandlord(requestedId, landlordPersonId)`,
    `resolveForCeo(companyId, requestedId)`, `dataUri`, `image`, `delete`.
    Remove `SignatureOwnerService`.
  - `CompanyService.delete`: logically delete signatures owned by the
    company's employees through their person ids before deleting employees;
    keep the lease unlink and the business exception while data exists.
  - `RentReceiptService`: resolve the lease by `(landlord, tenantPerson)` or
    `(landlord, tenantCompany)`, validate the tenant type, resolve the document
    company, branch the version lookup, store exactly one tenant id, and adapt
    `toDto`.
  - `ExpenseStatementDocumentService`: resolve the CEO employee signature.
  - `TemplateDataService`: `dataRentReceipt` receives the resolved tenant name
    and address (person or company); template keys unchanged. `dataExample`
    uses the same rule.
  - `E2eResetService`: seed one natural person landlord, one natural person
    tenant, one employee CEO, one normal lease; signatures per person.
  - `DataInitializer`: seed `Person`/`Employee` subclasses and the lease.
- Keep every production class < 300 lines; split services/controllers where
  needed.

## Frontend

- `api/types.ts`: add `PersonDto`, `PersonRequest`; remove `LandlordDto`,
  `LandlordRequest`, `TenantDto`, `TenantRequest`, `SignatureType`; update
  `LeaseDto`/`LeaseRequest` (`tenantId` nullable, `companyId`),
  `RentReceiptDto`/`RentReceiptRequest` (`tenantCompanyId`), `SignatureDto`
  (`personId`), employee `address`/`signatureCount`.
- `api/endpoints.ts`: `persons` CRUD; remove `landlords`/`tenants`;
  `signatures.list(personId)`, `create(personId, name, file)`, `remove`,
  `imageUrl`.
- `api/queries.ts`: `queryKeys.persons`, `usePersons()`,
  `queryKeys.signatures(personId)`, `useSignatures(personId)`; remove
  landlord/tenant hooks; `useActiveRentReceipt` gains the tenant company.
- Router/sidebar:
  - `/configuration` redirects to `/configuration/entreprise`.
  - `/configuration/entreprise` renders the Entreprise settings (company,
    employees, expense items).
  - `/configuration/lmnp` renders the LMNP page.
  - `AppShell` renders `Réglages > Configuration > Entreprise | LMNP`, plus
    `Templates` and `Admin IA` at the Réglages level. Mobile links flatten.
  - Update the `RentReceiptSignatureField` / `ExpenseGenerationFooter` links.
- `LMNP` page (`LmnpPage`): segmented tabs `Baux et adresses` (default) and
  `Personnes`.
  - `Baux et adresses`: address filter + lease list/form. `LeaseForm` shows a
    "Bail société" toggle; when checked, a "Locataire (société)" select bound to
    `companyId`; when unchecked, a person "Locataire" select bound to
    `tenantId`. The landlord select always lists natural persons. Switching the
    toggle clears the other tenant field. Surfaces stay conditional.
  - `Personnes`: list natural persons with name, address, signature count and
    Modifier/Retirer actions. `PersonForm` modal: name, address, signature
    section; creating keeps the modal open in saved mode for signatures.
  - Confirm dialog for deletion; a French error explains an active lease or
    existing signatures.
- `Entreprise` page: keep `CompanySection`, `ExpenseItemsManager`,
  `EmployeeSection`. `EmployeeForm` gains an optional address and the same
  signature section; a newly created employee can receive a signature without
  leaving the form. `EmployeeSection` displays address and signature count.
- Remove `SignaturesManager`, `SignatureForm`, `SignatureFormFields`,
  `SignatureCard`, `signatureConstants`, `LandlordForm`, `LandlordSection`,
  `TenantForm`, `TenantSection` and their tests/CSS. Reuse
  `SignatureImageField` for the file input.
- Generation pages:
  - Rent receipt: landlord select lists natural persons; tenant select lists
    natural persons and companies (grouped), encoded as `person:<id>` /
    `company:<id>` in the form state, mapped to `tenantId` or
    `tenantCompanyId`. The lease is resolved by the selected pair; options show
    signature names; alert when the landlord has none. `selectedLease`
    company/tenant resolution, the draft store and `requestFromValues` carry the
    tenant type.
  - Expense statement: find the company CEO employee, query signatures by that
    person; options show signature names; alert when there is no CEO or no CEO
    signature.
  - Remove type labels and legacy fallbacks.
- CSS: every styled component has a colocated CSS file, classes prefixed with
  the component name, `@reference` at the correct depth, rules inside
  `@layer components`, tokens only, each file < 300 lines. Split the LMNP/person
  CSS by block if needed.

## Tests to add or update

Backend:
- `PersonServiceTest`, `PersonControllerIntegrationTest` (or extend
  `ApiIntegrationTest`), `PersonMigrationPostgresTest`.
- `LeaseServiceTest` (from `RentConfigurationServiceTest`) covering normal vs
  enterprise lease, employee rejection, same-person rejection and deletion
  guards; `CompanyLeaseIntegrationTest`.
- `SignatureServiceTest`, `SignatureServiceEdgeCasesTest`,
  `SignatureControllerIntegrationTest`.
- `EmployeeServiceTest`, `CompanyServiceTest`, `RentReceiptServiceTest`
  (person and company tenant, version branch, signature ownership),
  `ExpenseStatementDocumentServiceTest`, `TemplateDataServiceTest`,
  `E2eResetIntegrationTest`, `DataInitializerTest`.

Frontend:
- New `LmnpPage.test.tsx`, `PersonnesSection.test.tsx`, `PersonForm.test.tsx`,
  `PersonSignatureSection.test.tsx`; update `SettingsPage.test.tsx`,
  `EmployeeSection.test.tsx`, `RentReceiptSettings.test.tsx`.
- `endpoints.test.ts`, `queries.test.ts`, `useRentReceiptPage.test.tsx`,
  `GenerateRentReceiptPage.test.tsx`, `useExpenseStatementPage.test.tsx`,
  `GenerateExpenseStatementPage.test.tsx`, `AppShell.test.tsx`; remove
  signature-constant/card/manager tests.
- Cypress `00-settings.cy.ts`, `01-rent-receipt.cy.ts`,
  `02-expense-statement.cy.ts`, `05-multi-company.cy.ts` selectors and flows.

## Acceptance

- Sidebar shows `Réglages > Configuration > Entreprise | LMNP`; `/configuration`
  lands on Entreprise; LMNP opens on Baux et adresses; Personnes is the second
  tab.
- Personnes lists natural persons only; add/edit includes name, address and
  signatures; signatures are added/removed and logically deleted.
- An enterprise lease requires a company tenant; a normal lease requires two
  natural persons; employees never appear in lease party selectors; the same
  person cannot be both parties of one lease.
- Employees are still added/edited only in Entreprise, with optional address,
  title, email and signatures.
- No `SignatureType`, no signature type selector, no separate Signatures card.
- Receipt picker lists only the selected landlord's signatures; statement
  picker lists only the company CEO's signatures; the backend rejects a
  signature owned by another person.
- A company-lease receipt shows the company as `locataire` and keeps versions
  isolated per pair; a normal-lease receipt shows the person.
- Migration preserves existing leases, receipts, persons and signatures; the
  legacy unlinked rule is tested and reported.
- Contract regenerated; no hand-edited `schema.ts`; `npm run typecheck`,
  `npm run lint`, `npm run format:check`, `npm run build` green.
- Coverage gates: backend `./mvnw -B verify` >= 90% LINE/BRANCH; frontend
  `npm run test:coverage` >= 90% lines/statements/functions/branches.
- Full E2E suite green in one run, with the exact command, exit code and counts
  in the handoff.

## Risks

- Id remapping across `lease`, `rent_receipt` and `signature` is the highest
  risk; the Postgres migration test is mandatory.
- Switching existing company leases from a person tenant to a company tenant
  changes the displayed tenant and the generated receipt; the migration test
  must assert the mapped company.
- Removing `/api/landlords` and `/api/tenants` is a breaking contract change;
  report the exact paths.
- `rent_receipt` version uniqueness with a nullable tenant requires the
  COALESCE expression index; a plain unique index would allow duplicate
  company-tenant versions.
- Legacy unlinked landlord signatures may be logically deleted; report the
  count if any.
- Deleting a person with signatures or an active lease is blocked; the UI must
  explain it in French.
- The person add form must keep working after creation to allow signatures; do
  not close the modal before the signature step.
