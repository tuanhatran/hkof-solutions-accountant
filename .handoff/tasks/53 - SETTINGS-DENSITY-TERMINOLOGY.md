# 53 — SETTINGS-DENSITY-TERMINOLOGY

Status: DONE
Branch: feat/53-settings-density-terminology
Base: f740247
Size: L
Round: 2/2

## Goal
Densify the five settings management lists (employees, persons, LMNP leases, company leases, expense items) with 36px rows, visible column labels and right-aligned tabular numbers, and unify French terminology: Société (not Entreprise), Modèle (not Template), Poste (not Frais/type de frais for the managed entity). Out of scope: sort/filter, side-by-side compare, History/Templates density, Admin IA/Analyse IA drift, backend "backend" mentions, global `.expense-table` restyle, backend/contract/money/migration/LLM.

## Files
Context (read only): `.handoff/plans/50 - CABINET-UI-REVIEW.md` · `frontend/src/index.css` (`.expense-table` 200-214, `.number` 222-226) · `frontend/src/components/settings/SettingsSection.tsx`
Writable: `frontend/src/pages/settings/{EmployeeSection.tsx,EmployeeSection.css,ExpenseItemsManager.tsx,ExpenseItemsManager.css,CompanyLeaseTab.tsx,CompanyLeaseTab.css}` · `frontend/src/components/settings/{PersonnesSection.tsx,PersonnesSection.css,LeaseSection.tsx,LeaseSection.css}` · `frontend/src/i18n/resources/{fr,en}.ts`
Writable tests: `frontend/src/pages/settings/{EmployeeSection,ExpenseItemsManager,CompanyLeaseTab,ExpenseItemForm,SettingsPage,LmnpPage,CompanyLeaseStatementModal,useCompanyForm}.test.tsx` · `frontend/src/components/settings/{PersonnesSection,LeaseSection,LeaseReceiptModal}.test.tsx` · `frontend/src/pages/templates/TemplatesTab.test.tsx` · `frontend/src/pages/{rent-receipt/GenerateRentReceiptPage,expense-statement/GenerateExpenseStatementPage}.test.tsx` · `frontend/src/components/layout/{AppNav,AppShell,CompanySwitcher}.test.tsx` (codegraph affected; full suite is the gate)

## Constraints
Contract: none. Display only: no new client arithmetic (keep the existing lease total); keep every `data-cy`; do not edit the shared `.expense-table` rules in `index.css` — add an `ExpenseItemsManager`-scoped table modifier; no `any`; FR UI + EN parity; component CSS <300 lines; builder commits once (explicit paths), nobody pushes.
Design: rows `min-h-9` `px-3 py-1.5`, 1px separators in one bordered list, headers 11px normal case; numeric cells `.number` right-aligned; below `md` stack and hide headers; no horizontal overflow at 375px. Columns — employees: Salarié · Intitulé · Coordonnées · Signatures; persons: Personne · Adresse · Signatures; LMNP leases: Bail · Société · Loyer · Charges · Total; company leases: address+landlord then aligned Loyer/Charges and actions. Add the column keys FR/EN.
Terminology (FR values, keys unchanged): Société — `settings.company.tabsAria` "Sections de la société", `expenseStatement.footer.companyLink` "Société"; Modèle — replace every user-facing "template" in fr.ts (errors, fields, previews, templates page, `settings.company.tabs.templates`/`settings.lmnp.tabs.templates` → "Modèles"), EN keeps "Template"; Poste — `settings.expenses.title` "Postes", `add` "Ajouter un poste", `form.createTitle` "Ajouter un poste" (fixes "frais de frais"), `form.editTitle` "Modifier le poste", `deleteDialog.title` "Retirer ce poste ?", `EXPENSE_ITEM_UNKNOWN_CODE` "Poste inconnu : {{code}}", keep "Type de frais" only for `expenseStatement.fields.type` and its required validation, EN entity "Expense item".

## Acceptance
- [ ] Five lists dense with visible labels and aligned `.number` values; all `data-cy`, edit/remove/dialog/accordion behavior unchanged; 375px stacks without overflow.
- [ ] French copy contains no user-facing "Template", "Entreprise" or expense-entity "Frais"/"frais de frais"; canonical terms above; EN meaning mirrored; i18n parity test green.
- [ ] New tests assert headers/classes and the terminology; full suite green; gates and changed-line coverage >= 80%.

## Commands
- `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- `scripts/diff-coverage.sh f740247 frontend`
- full E2E once: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`, then `down -v --remove-orphans`; Docker unavailable → BLOCKED.

## Evidence
Files: EmployeeSection, PersonnesSection, LeaseSection, CompanyLeaseTab, ExpenseItemsManager (+their CSS), i18n fr/en + i18n.test, copy-tied tests, api/client.test.
PASS `npm run test:coverage` — 66 files, 808 tests (FR terminology red 27/239 → green; EmployeeSection red 3/13; PersonnesSection red 3/10; LeaseSection red 3/10; CompanyLeaseTab red 3/23; ExpenseItemsManager red 1/12 → all green).
PASS `npm run lint` — eslint clean.
PASS `npm run format:check` — Prettier clean.
PASS `npm run build` — vite 2421 modules transformed.
PASS `scripts/diff-coverage.sh f740247 frontend` — 94% (18 lines, 1 missing: CompanyLeaseTab.tsx 250).
PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` — exit 0, 6 specs, 26/26 tests, 0 failing, 0 retries; `down -v --remove-orphans` exit 0.
Deviation: `api/client.test.ts` FR FILE_TOO_LARGE copy updated (tied to terminology, beyond listed tests); company-lease meta value is now "Bailleur {{landlord}}" since rent/charges have own columns.
Contract: none.
Commit: ee4c06c 26 files +838/-371
Round 1 reviewer: BLOCKERS (1) — header and row grid templates share flexible tracks but differ in the last `auto` track (empty header cell vs action buttons), so Signatures/Loyer/Charges/Total headers sit right of their values in `EmployeeSection.css:16/:24`, `PersonnesSection.css:16/:24`, `LeaseSection.css:20/:28`, `CompanyLeaseTab.css:17/:33`. Fix: fixed actions track identical in header and row.
Round 1 fix (CSS only, no TSX/test/copy change): header and row templates are now byte-identical — EmployeeSection/PersonnesSection last track `12rem`, LeaseSection `17.5rem`, CompanyLeaseTab `13rem`; flex tracks, gaps, padding, `md:` breakpoints and hidden headers unchanged.
PASS `npx vitest run EmployeeSection PersonnesSection LeaseSection CompanyLeaseTab.test.tsx` — 4 files, 56/56 tests.
PASS `npm run lint` — eslint clean; PASS `npm run format:check` — Prettier clean; PASS `npm run build` — vite built.
`codegraph affected` on the 4 CSS files — no test files affected; affected tests run per handoff gate.
E2E/coverage: skipped, CSS-only gate row (no TSX, tests or coverage change).
Deviation: the fix commit message carries a `Co-authored-by` trailer absent from repo history; `--amend` is forbidden, so it is left as is.
Commit: 87ab202 4 files +8/-8
Round 2 reviewer: PASS — header/row tracks identical in all four lists (12rem/12rem/17.5rem/13rem), buttons fit or wrap, no 375px overflow, fix diff limited to the four CSS files.
lead: `frontend/src/i18n/i18n.test.ts` was touched beyond the listed writable tests (parity + canonical-terminology + no "template"/"entreprise"/"frais de frais" assertions); directly scoped and accepted, recorded as a Files-block omission.
lead: DONE — user accepted
