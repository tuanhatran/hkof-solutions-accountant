# 22 — MULTI-COMPANY-EMPLOYEES — design and work plan

Status: TODO
Branch: `feat/multi-company-employees` (proposed; lead creates it after user confirmation)
Size: L
Round: 0/2
Task handoff: `.handoff/tasks/22 - MULTI-COMPANY-EMPLOYEES.md`

This file is deliberately portable: the same `.handoff/` tree is read by
`.qoder/agents/`, `.opencode/agents/` and `.github/agents/`. If the OpenCode free
quota is reached, resume on Qoder from the "Resume on Qoder" section without
re-planning.

## Why

Today the application is single-company:

- `Settings` is a singleton row (`id = 1`) holding `companyName`, `legalForm`,
  `siren`, `companyAddress`, `managerName`, `homeAddress`, `totalArea`,
  `businessArea`, `issuePlace`; `SettingsService` hard-codes `findById(1L)`.
- `ExpenseItem.code` is globally unique; `ExpenseStatement` has no company.
- `Lease` has no company link.
- `Signature` is `LANDLORD` or `ENTREPRISE_CEO`; there is no employee.
- There is no authentication or authorization anywhere (README assumption #1).

The target: several companies, each owning its expense items and statements;
employees with a title; signatures attached to employees; a lease optionally
linked to a company. RBAC is documented now and enforced in a later task.

## Goals

- A `Company` aggregate replaces `Settings` as the company profile.
- Every expense item and expense statement belongs to exactly one company.
- Employees belong to one company and carry one title enum.
- Employee signatures are versioned attachments (logical deletion only).
- A lease may optionally link to a company.
- `product_prompt.md` and `README.md` record the deferred RBAC contract.
- Existing data migrates safely into company 1.

## Non-goals (out of scope)

- Login, sessions, password storage, Spring Security, `@PreAuthorize`, route
  guards, "acting user" selector, audit trail. RBAC enforcement is a later task.
- Reworking `CalculationService`, the money rules, or the template sandbox.
- Changing the PDF layout, the rent-receipt wording, or the LLM path.
- Dropping `settings_legacy` (kept for one task as a rollback aid).
- Committing, pushing, resetting, cleaning or stashing.

## Decisions (my calls — correct them before W1 if wrong)

- **D1 — one company per employee.** No cross-company membership; simplest model
  and no join table. A later task can add membership if needed.
- **D2 — title is descriptive.** `EmployeeTitle { CEO, CFO, ACCOUNTANT, EMPLOYEE }`
  is stored and displayed. It grants nothing today. RBAC maps rights to titles
  later; no role/permission table is created now.
- **D3 — signatures attach to employees.** Each employee has 0..n signature
  images (versions), logically deleted. Landlord signatures keep
  `landlord_id`. `SignatureType` keeps `LANDLORD` and `ENTREPRISE_CEO`, and gains
  `EMPLOYEE`; new employee uploads use `EMPLOYEE`, the seeded CEO and legacy
  rows keep `ENTREPRISE_CEO`.
- **D4 — `Company` replaces `Settings`.** All company fields move to `company`.
  The old table is renamed `settings_legacy` and kept read-only; it is not
  exposed. `/api/settings` and `SettingsService` are removed. Frontend uses
  `/api/companies`.
- **D5 — lease link is optional.** `lease.company_id` is nullable. When set, the
  rent receipt uses that company's identity/home data; when null, the active
  company selected in the UI is used.
- **D6 — expenses are company-scoped.** `expense_item.company_id` and
  `expense_statement.company_id` are not null after backfill. Item code is unique
  per company; statement numbering/version/archive is per company and month.
- **D7 — active company is client state.** A Zustand store persists
  `activeCompanyId` in `localStorage` (`homeofficeexpenses.company`). The backend
  never guesses "current company"; every scoped request carries `companyId`.
- **D8 — contract first.** `openapi/openapi.yaml` is changed before backend code;
  `npm run gen:api` regenerates `frontend/src/api/schema.ts`; never hand-edit it.
- **D9 — RBAC is documentation only.** The UI may show the employee title, but
  must not hide actions or claim rights are enforced. `product_prompt.md` states
  the target matrix and that it is not implemented.
- **D10 — preserve existing data.** V7 copies `settings` row 1 into `company`
  id 1, backfills every `expense_item`, `expense_statement`, `lease` and
  `signature` row, seeds one CEO employee from `manager_name`, and renames the
  old table. A Postgres migration test proves the backfill.

## Data model

### `company`

`id`, `name` (`company_name`), `legal_form`, `siren`, `address`
(`company_address`), `manager_name`, `home_address`, `total_area`,
`business_area`, `issue_place`, `deleted`, `created_at`, `updated_at`.

- `deleted` default false; queries use `findByDeletedFalse...`.
- No DB unique on `name`; service rejects a duplicate non-deleted `siren` when
  present (French `BusinessException`).

### `employee`

`id`, `company_id` not null, `first_name`, `last_name`, `email` nullable,
`title` varchar(20) not null, `deleted`, `created_at`, `updated_at`.

- Enum stored as string: `CEO`, `CFO`, `ACCOUNTANT`, `EMPLOYEE`.
- Partial unique index `(company_id, lower(email)) WHERE email IS NOT NULL AND deleted = FALSE`.
- Index `(company_id, deleted)`.

### `signature` (altered)

- Add `company_id` (nullable for landlord signatures), `employee_id` (nullable).
- Keep `type`, `landlord_id`, `name`, `mime_type`, `file_name`, `image`,
  `deleted`, `created_at`, `updated_at`.
- Check: `(type = 'LANDLORD' AND landlord_id IS NOT NULL AND employee_id IS NULL)`
  OR `(type IN ('EMPLOYEE','ENTREPRISE_CEO') AND employee_id IS NOT NULL AND landlord_id IS NULL)`.
  Legacy `ENTREPRISE_CEO` rows are backfilled to the seeded CEO.
- Index `(company_id, employee_id, deleted)`.

### `lease` (altered)

- Add nullable `company_id`; `ON DELETE` restricted (logical deletion only).

### `expense_item` / `expense_statement` (altered)

- Add `company_id` not null after backfill.
- Drop `expense_item.code` global unique, add `(company_id, code)` unique.
- Replace statement uniqueness with `(company_id, month, version)`.
- Index `(company_id, month, version)` and `(company_id, status)`.

## API contract (W1)

New paths:

- `GET/POST /api/companies`
- `GET/PUT/DELETE /api/companies/{id}`
- `GET/POST /api/companies/{companyId}/employees`
- `PUT/DELETE /api/employees/{id}`

Changed:

- `/api/signatures`: `GET` accepts `companyId` and `employeeId`; `POST` requires
  `employeeId` for employee signatures (multipart: `type`, `employeeId`, `name`,
  `file`) and keeps `landlordId` for landlord signatures; `SignatureDto` gains
  `companyId`, `companyName`, `employeeId`, `employeeName`.
- `/api/leases`: `LeaseRequest`/`LeaseDto` gain `companyId`, `companyName`.
- `/api/expense-items`: `GET` requires `companyId`; `POST` body/param carries
  `companyId`; `ExpenseItemDto` gains `companyId`.
- `/api/expense-statements`: list/get require `companyId`; draft, calculation,
  preview and generation carry `companyId`; `StatementDto` gains `companyId`.
- `/api/rent-receipts`: request/draft accept optional `companyId` (lease wins).
- `/api/settings`: removed. This is a breaking contract change and must be
  reported in the deliverable.
- All amounts stay decimal strings; errors stay `application/problem+json`;
  French messages.

## Work items

Order matters only for W1; W0, W2–W3 and W4–W6 may run in parallel after it.

### W0 — Documentation (builder, parallel with W1)

Files: `product_prompt.md`, `README.md`.

- Add the section below to `product_prompt.md`, after the domain model and before
  the document sections. Keep the technical text in English; the quoted UI/domain
  terms stay French.
- Add the assumption bullets below to `README.md` "## Assumptions".
- Do not claim RBAC is implemented.

`product_prompt.md` section:

```markdown
## Multi-company, employees and deferred RBAC

The application manages several companies. Each company owns its identity
(name, legal form, SIREN, address, manager), its home-office data (home address,
total area, business area, issue place), its expense items and its expense
statements. A lease may optionally be linked to a company.

Employees belong to one company and carry one title: `CEO`, `CFO`, `ACCOUNTANT`
or `EMPLOYEE`. Signatures are attached to an employee; a landlord signature
remains attached to a landlord. A company may keep several signatures per
employee; a previous image is logically deleted, never overwritten.

### Rights (target contract — RBAC deferred)

| Title | Edit expense report | Export expense report | Company/employee settings |
| --- | --- | --- | --- |
| CEO | yes | yes | yes |
| CFO | yes | yes | read |
| ACCOUNTANT | yes | yes | read |
| EMPLOYEE | no (read-only) | no | no |

**Not implemented yet.** There is no authentication, session, user account or
authorization check. The title is descriptive and every user of the local
instance can edit and export. The matrix above is the contract for the future
RBAC task; the UI must not present it as enforced.
```

`README.md` bullets:

```markdown
- The application is multi-company. Each company owns its expense items and statements, its home-office data and its issue place; the active company is selected in the UI and persisted locally. A lease may optionally link to a company.
- Employees belong to one company and carry a descriptive title (`CEO`, `CFO`, `ACCOUNTANT`, `EMPLOYEE`). Signatures attach to an employee; landlord signatures remain attached to a landlord.
- RBAC is documented but not implemented: there is no authentication or authorization. The target matrix (CEO/CFO/accountant edit and export expense reports) lives in `product_prompt.md`; a future task enforces it.
- Existing data is migrated into company 1; the former `settings` row is preserved as `settings_legacy` and `/api/settings` is removed.
```

### W1 — Contract and generated types (builder, gate)

Files: `openapi/openapi.yaml`, `frontend/src/api/schema.ts` (generated only),
`frontend/cypress/support/helpers.ts` if the reset payload changes.

Steps:

1. Change the YAML paths and schemas listed above.
2. `cd frontend && npm run gen:api`.
3. Update `frontend/src/api/types.ts` re-exports only if it names changed types.
4. Report every path/field removed: `/api/settings`, global item code, global
   statement numbering.

Acceptance: `npm run typecheck` still fails only on call sites not yet migrated
(expected until W4–W6); `schema.ts` contains the new paths; no `any`.

### W2 — Backend domain + migration (builder A)

Files:

- `backend/src/main/resources/db/migration/V7__multi_company.sql`
- `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/Company.java`
- `.../domain/Employee.java`, `.../domain/EmployeeTitle.java`
- `.../domain/Signature.java`, `.../domain/SignatureType.java`
- `.../domain/Lease.java`, `.../domain/ExpenseItem.java`, `.../domain/ExpenseStatement.java`
- `.../repository/CompanyRepository.java`, `.../repository/EmployeeRepository.java`
- `.../repository/{ExpenseItem,ExpenseStatement,Lease,Signature}Repository.java`

Tests:

- `backend/src/test/java/.../domain/CompanyTest.java`
- `backend/src/test/java/.../service/MultiCompanyMigrationPostgresTest.java`
  (follow `RentConfigurationMigrationPostgresTest` for Testcontainers/Flyway).

Acceptance: migration applies on a V6 database and on a fresh database; company
1 is created from `settings`; every legacy row has `company_id = 1`; the seeded
CEO owns the legacy `ENTREPRISE_CEO` signatures; constraints reject a cross-company
code and duplicate statement version.

### W3 — Backend services, controllers, DTOs (builder A)

Files:

- `.../service/CompanyService.java`, `EmployeeService.java`
- `.../service/SignatureService.java`, `ExpenseItemService.java`,
  `ExpenseStatementService.java`, `RentReceiptService.java`,
  `RentConfigurationService.java`, `SettingsService.java` (delete),
  `.../service/template/TemplateDataService.java`
- `.../web/CompanyController.java`, `EmployeeController.java`,
  `SignatureController.java`, `ExpenseItemController.java`,
  `ExpenseStatementController.java`, `RentReceiptController.java`,
  `RentConfigurationController.java`, `SettingsController.java` (delete)
- `.../web/dto/CompanyDtos.java`, `EmployeeDtos.java`, `SignatureDtos.java`,
  `ExpenseItemDtos.java`, `StatementDtos.java`, `RentConfigurationDtos.java`,
  `SettingsDtos.java` (delete)
- `.../config/DataInitializer.java`, `.../service/E2eResetService.java`

Rules:

- Company-scoped reads use `@Transactional(readOnly = true)` and
  `findBy...CompanyIdAndDeletedFalse...`.
- `CompanyService.entity(id)` throws `NotFoundException("Société introuvable.")`.
- `EmployeeService` validates title and names; duplicates per company.
- `SignatureService.resolveForEmployee` mirrors `resolveForLandlord`; the expense
  statement default is the company CEO's first non-deleted signature.
- `ExpenseStatementService` and `TemplateDataService` take `Company` instead of
  `Settings`; the pro-rata still goes through `CalculationService`.
- Numbering/version/archive scoped by `(companyId, month)`.
- `DataInitializer` creates company 1, a CEO employee, the six expense items for
  company 1, and links the default lease to company 1.
- `E2eResetService` resets and reseeds the same shape.

Tests:

- `CompanyServiceTest`, `EmployeeServiceTest`, `SignatureServiceTest`
  (extend edge cases), `ExpenseItemServiceTest`, `ExpenseStatementServiceTest`,
  `RentConfigurationServiceTest`, `RentReceiptServiceTest`,
  `TemplateDataServiceTest`, `DataInitializerTest`, `ApiIntegrationTest`,
  `E2eResetIntegrationTest`, `SignatureControllerIntegrationTest`.
- Delete/replace `SettingsServiceTest`.

Acceptance: no `Settings` reference remains in `backend/src/main`; every scoped
query filters by company; French messages; no `double`.

### W4 — Frontend API, store, shell (builder B)

Files:

- `frontend/src/api/endpoints.ts`, `frontend/src/api/queries.ts`,
  `frontend/src/api/types.ts`
- `frontend/src/state/company.ts` and `company.test.ts`
- `frontend/src/components/layout/AppShell.tsx` + `.css`, `AppShell.test.tsx`
- `frontend/src/lib/validation.ts` (company/employee schemas)

Rules:

- `queryKeys.companies`, `queryKeys.employees(companyId)`,
  `queryKeys.signatures(companyId, employeeId)`, and company-scoped variants for
  items, statements, rent receipts. Invalidate with `queryKeys.companiesAll`.
- Zustand store: `activeCompanyId: number | null`, `setActiveCompany(id)`,
  hydrate from `localStorage`, validate against the fetched list, fall back to the
  first non-deleted company.
- Selector in `AppShell` (French labels, accessible `<select>` with label, no
  `data-cy` unless the spec already uses it). Empty state if no company.

Acceptance: no query key string literal; `activeCompanyId` survives reload; a
deleted/invalid stored id falls back safely.

### W5 — Frontend settings: companies, employees, signatures (builder B)

Files:

- `frontend/src/pages/settings/SettingsPage.tsx` + `.css`
- `frontend/src/pages/settings/CompanyForm.tsx`, `CompanySection.tsx` (new)
- `frontend/src/pages/settings/EmployeeForm.tsx`, `EmployeeSection.tsx` (new)
- `frontend/src/pages/settings/SettingsCompanySection.tsx` (replace/rename),
  `SettingsHomeSection.tsx`, `settingsValues.ts`
- `frontend/src/components/settings/LeaseForm.tsx` + `.css`
- `frontend/src/components/signatures/*` (`SignatureForm`, `SignatureCard`,
  `SignaturesManager`) + tests

Rules:

- "Entreprise" tab becomes a company selector + editor: create, edit, logical
  delete, set active.
- "Salariés" list per company: name, email, title (`PDG`, `DAF`, `Comptable`,
  `Salarié` in French UI; enum values stay English in code/API), create/edit/delete.
- Signatures: filter by company/employee, upload per employee, default badge on
  the CEO signature used by expense statements.
- Lease form: optional company select (`Aucune société` by default).
- Keep the existing French copy and `data-cy` conventions; add `data-cy` for new
  controls only when the E2E spec needs them.

Acceptance: a second company can be created from the UI and selected; an employee
and a signature can be attached to it; no RBAC hiding.

### W6 — Frontend expense, rent, history (builder C)

Files:

- `frontend/src/pages/expense-statement/*` (`useExpenseStatementPage.ts`,
  `GenerateExpenseStatementPage.tsx`, types)
- `frontend/src/pages/rent-receipt/*` (`useRentReceiptPage.ts`,
  `rentReceiptRequest.ts`, page)
- `frontend/src/pages/history/*` (`HistoryPage.tsx`, panels)
- `frontend/src/pages/settings/ExpenseItemsManager.tsx` (company-scoped)

Rules:

- Every draft/calculation/preview/generate request carries the active company.
- Expense items, statements and history are filtered by the active company.
- Rent receipt: if the selected lease has a company, use it; otherwise the
  active company. Show the company name in the header.
- Never compute an authoritative amount client-side; keep `parseAmount` only for
  form display.

Acceptance: switching company changes the item list, the draft, the history and
the exported document; a companyless lease still works.

### W7 — E2E and full gates (builder D / lead run)

Files:

- `frontend/cypress/e2e/00-settings.cy.ts` (companies, employees, signatures)
- `frontend/cypress/e2e/01-rent-receipt.cy.ts` (lease linked/unlinked)
- `frontend/cypress/e2e/02-expense-statement.cy.ts` (company scope)
- new `frontend/cypress/e2e/05-multi-company.cy.ts` (create 2 companies, switch,
  create employee/signature, generate + export, verify isolation)

Acceptance: every spec and test green on the task branch, no retry-only pass.

### W8 — Merge, review, gates

- Combined diff review (mandatory: contract, migration, money-adjacent).
- `cd backend && ./mvnw -B verify` >= 90% LINE/BRANCH.
- `cd frontend && npm run typecheck && npm test && npm run test:coverage && npm run build`
  >= 90% lines/statements/functions/branches.
- Full E2E command; record exact counts.
- Every production class < 300 lines.
- Status `USER_REVIEW`; only the lead sets `DONE` after user acceptance.

## Progress (append-only)

- [x] W0 docs
- [x] W1 contract + generated types
- [ ] W2 domain + V7 migration
- [ ] W3 services/controllers/DTOs + seed/reset
- [ ] W4 frontend API/store/shell
- [ ] W5 frontend companies/employees/signatures/lease
- [ ] W6 frontend expense/rent/history
- [ ] W7 E2E
- [ ] W8 review + full gates

## Resume on Qoder (quota fallback)

1. Open the repo; `git branch --show-current` must be
   `feat/multi-company-employees`. If not, `git switch feat/multi-company-employees`
   (never create a second branch; never work on `main`).
2. Read `.handoff/tasks/22 - MULTI-COMPANY-EMPLOYEES.md` and this plan.
3. `git status --short`; preserve every modified/untracked file. Never
   `reset`, `clean`, `stash` or revert.
4. Read the first unchecked item in "Progress" and the matching work item above.
5. Read `.qoder/agents/builder.md` (source of truth) and
   `.opencode/instructions/*.md`; follow the same rules.
6. Run only the commands listed for that work item; append evidence lines to the
   task handoff. Never rewrite another agent's evidence.
7. Stop at a clean point if the quota/rate limit hits, add
   `BLOCKED — quota, next: <exact command>` to "Resume notes", and hand over.
8. Do not set `DONE`; the lead sets it only after explicit user acceptance.
9. Do not pass a model override when dispatching builder/reviewer.

## Resume notes

- `2026-10-24 lead:` plan written; no code changed; branch not created yet.
  Next: user confirms branch name, lead creates it, W0/W1 start.
- `2026-10-24 lead:` user confirmed; branch `feat/multi-company-employees`
  created from `main`; W0 (docs) and W1 (contract) dispatched in parallel.

## Evidence

Append one line per event; never rewrite a line.

- `2026-10-24 lead:` sized L; RBAC confirmed deferred; design decisions D1–D10
  recorded; usage estimate 250–450 model requests (free tier ~440–880/day).
- `2026-10-24 lead:` W0 PASS (product_prompt §125, README §157); W1 PASS
  (`/api/companies`, `/api/employees`, `/api/settings` removed, `gen:api` exit 0).
  `schema.ts` diff is 5 602 lines because the generator emits 4-space indentation;
  `git diff -w` is 484 lines. Generated output kept as-is (file is prettier-ignored).
- `2026-10-24 lead:` W2 (backend domain + V7) and W4 (frontend API/store/shell)
  dispatched in parallel. W2 will intentionally break old `Settings`-based tests
  until W3 removes that code; W4 will leave page typecheck errors until W5–W6.
