# 46
Status: DONE
Branch: feat/46-company-lease-settings-i18n
Base: 312e575
Size: L
Round: 2/2
## Goal
Make the company & lease settings UI fully bilingual FR/EN with react-i18next (settings page, company tabs/identity, lease tab/view/form, lease receipt modal, statement modal, related toasts) plus the `companySchema`/`leaseSchema` validation messages and `formatPeriod`, while French remains byte-identical. Out of scope: employees, expense items, people/signatures, LMNP page, templates, Admin IA, PDFs/templates, backend, contract, other schemas and formatters.
## Files
Read: .handoff/tasks/{39 - I18N-FOUNDATION,43 - RENT-RECEIPTS-UI-I18N,45 - HISTORY-UI-I18N}.md · frontend/src/i18n/{index.ts,resources/fr.ts,resources/en.ts} · frontend/src/test/setup.ts · frontend/src/pages/settings/{settingsValues.ts,useCompanyLeaseStatementModal.ts,SettingsCardSection.tsx}
Write: frontend/src/pages/settings/{SettingsPage,SettingsCompanySection,CompanySection,CompanyIdentityView,CompanyIdentityModal,CompanyLeaseTab,CompanyLeaseView,CompanyLeaseStatementModal}.tsx · frontend/src/pages/settings/useCompanyForm.ts · frontend/src/components/settings/{LeaseSection,LeaseForm,LeaseReceiptModal}.tsx · frontend/src/components/settings/{useRentReceiptSettings,useLeaseReceiptModal}.ts · frontend/src/lib/validation.ts · frontend/src/lib/format.ts · frontend/src/i18n/resources/{fr,en}.ts · frontend/src/pages/settings/{SettingsPage,CompanyIdentityView,CompanyIdentityModal,CompanyLeaseTab,CompanyLeaseView,CompanyLeaseStatementModal,useCompanyForm}.test.tsx · frontend/src/components/settings/{LeaseSection,LeaseReceiptModal}.test.tsx · frontend/src/lib/{validation,format}.test.ts
Affected tests: the 11 test files above · frontend/src/components/settings/CompanyLeaseStatementHistory.test.tsx · frontend/src/pages/settings/SettingsPage.test.tsx · full frontend suite · full E2E
Symbols: SettingsPage · CompanySection/CompanyLeaseTab · LeaseSection/LeaseForm/LeaseReceiptModal · CompanyLeaseStatementModal · companySchema/leaseSchema · formatPeriod
## Constraints
FR byte-identical (wording, typographic apostrophes, guillemets `« »`, ellipses, plurals) · EN names domain items naturally ("Company", "Lease", "Landlord", "Tenant", "Rent receipt", "Expense statement") per the accepted Task 43–45 precedent; FR keeps "Société", "Bail", "Bailleur", "Locataire", "Quittance", "Note de frais"; `data-cy`/`dataCy` unchanged · module-level constants must not freeze translations (`CompanySection` TABS labels and `CompanyIdentityView` rows built at render/inside the component) · only `companySchema` and `leaseSchema` (including the `optionalSurface` messages) become language-aware, re-evaluated per parse (Zod 4 function errors); `employeeSchema`/`personSchema`/`expenseItemSchema`/`llmSchema` stay French · only `formatPeriod` becomes language-aware (FR `du … au …` unchanged, EN `from … to …`); `formatEUR`/`formatDate`/`formatMonth`/`formatPercentage` untouched · `ExpenseItemsManager` and employee content stay French (Task 47) · no `any`, no money logic, no secrets in messages · builder commits once, explicit paths, no push
## Acceptance
- No hardcoded French UI text remains in the 16 writable production files except dynamic data and the FR bundle; every label, help, placeholder, aria-label, toast, empty state and dialog string uses `t()`.
- In EN the settings page, company tabs/identity/modal, lease tab/view/form, lease receipt modal and statement modal read English; switching FR↔EN relabels without reload (`TABS`, identity rows, `formatPeriod`).
- FR output is byte-identical to base for every changed string, including `« Société »` dialogs, plural forms and `data-cy` selectors.
- `companySchema` and `leaseSchema` messages follow the language at parse time in both `zodResolver` and `safeParse`; other schemas keep their French messages; `formatPeriod` returns FR/EN forms.
- Existing FR tests stay green; new EN tests cover page header, tabs, identity view/modal, lease form validation, lease receipt modal, statement modal, toasts and `formatPeriod`.
- Frontend diff coverage >= 80%; full E2E green.
- Fix blocker (round 2, scope): bring `LeaseForm.tsx` back under 300 lines by extracting the company-lease surface fields (total/business area, `isCompanyLease` guard) into a small colocated subcomponent; no behavior, wording, key or `data-cy` change.
## Commands
- cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build
- scripts/diff-coverage.sh 312e575 frontend
- full E2E once: docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress; then down -v --remove-orphans; if Docker unavailable set BLOCKED.
## Builder evidence
- Files: 29 changed (16 production incl. fr/en resources, 11 tests, SettingsPage/SettingsCompanySection) — commit 8b363e3.
- Red: validation/format 4 failed | 43 passed; 9 settings/lease component files 16 failed | 92 passed.
- Green: 11 targeted files 155 passed (11); affected regressions 56 files 688 passed.
- PASS `npm run test:coverage` — Test Files 63 passed (63), Tests 723 passed (723).
- PASS `npm run lint` — exit 0; PASS `npm run format:check` — exit 0; PASS `npm run build` — exit 0.
- PASS `scripts/diff-coverage.sh 312e575 frontend` — 32 changed lines, 0 missing, 100%.
- PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` — exit 0, 6 specs / 26 tests passed, 0 retries; `down -v --remove-orphans` exit 0.
- Coverage: red then green in format.test.ts (formatPeriod EN), validation.test.ts (companySchema/leaseSchema EN at parse time), SettingsPage, IdentityView/Modal, LeaseTab/View, StatementModal, useCompanyForm, LeaseSection, LeaseReceiptModal.
- Deviations: two former "companySchema stays French" assertions updated because the spec now localizes companySchema; new LeaseSection EN test asserts "Company: No company" (fixture lease has no companyName). Test-only import/assert fixes, no FR assertion weakened.
- Contract: none (frontend only, no openapi/schema.ts/backend changes).
- Commit: 8b363e3 29 files +1224/-214
- 2026-10-27 lead: VERDICT: BLOCKERS (1) (reviewer, round 1/2) — `components/settings/LeaseForm.tsx` 301 lines (>300); extract the company-lease surface fields; status CHANGES_REQUESTED, back to builder.
- Round 2 fix: new `components/settings/LeaseAreaFields.tsx` (49 lines) holds the `isCompanyLease`-guarded total/business area FieldGroups; `LeaseForm.tsx` now 273 lines. Same DOM order, ids `bail-surface-totale`/`bail-surface-pro`, `data-cy` `input-surface-totale`/`input-surface-pro`, labels/help keys, `register`/`errors` wiring. No wording, key, validation or behavior change; no FR output change.
- PASS baseline `npx vitest run CompanyLeaseTab.test.tsx SettingsPage.test.tsx` — 2 files, 46 passed (before extraction).
- PASS `npx vitest run CompanyLeaseTab SettingsPage LeaseSection` — 3 files, 54 passed (after extraction).
- PASS `codegraph affected` regressions — 7 files, 88 passed.
- PASS `npm run test:coverage` — exit 0, 63 files / 723 tests passed.
- PASS `npm run lint` exit 0; `npm run format:check` exit 0; `npm run build` exit 0.
- PASS `scripts/diff-coverage.sh 312e575 frontend` — 42 changed lines, 0 missing, 100%.
- PASS E2E `docker compose -p homeofficeexpenses-e2e ... up --build --abort-on-container-exit --exit-code-from cypress` — exit 0, 6 specs / 26 tests passed, 0 failing, 0 retries; `down -v --remove-orphans` exit 0.
- `wc -l`: LeaseForm.tsx 273, LeaseAreaFields.tsx 49.
- Commit: f26c94f 2 files +51/-30
- 2026-10-27 lead: VERDICT: PASS (reviewer, round 2/2) — fix commit 8b363e3..f26c94f verbatim extraction, LeaseForm 273 lines / LeaseAreaFields 49, no FR/key/data-cy change, no blocker; status USER_REVIEW.
- 2026-10-27 lead: DONE — user accepted.