# 47
Status: DONE
Branch: feat/47-people-expenses-lmnp-i18n
Base: f26c94f
Size: M
Round: 1/2
## Goal
Finish the settings i18n batch: make employees, expense items, natural persons/signatures and the LMNP page fully bilingual FR/EN with react-i18next, including the language-aware `PERIODICITIES`/`EMPLOYEE_TITLES` labels, signature upload errors, and the `employeeSchema`/`personSchema`/`expenseItemSchema` messages, while French remains byte-identical. Out of scope: company/lease settings (Task 46), templates, Admin IA/`llmSchema`, PDFs/templates, backend, contract, other schemas/formatters.
## Files
Read: .handoff/tasks/{39 - I18N-FOUNDATION,44 - EXPENSE-STATEMENTS-UI-I18N,46 - COMPANY-LEASE-SETTINGS-I18N}.md · frontend/src/i18n/{index.ts,resources/fr.ts,resources/en.ts} · frontend/src/test/setup.ts · frontend/src/pages/settings/ExpenseItemSwitchField.tsx · frontend/src/components/forms/FileDropzone.tsx
Write: frontend/src/pages/settings/{LmnpPage,EmployeeSection,EmployeeForm,ExpenseItemsManager,ExpenseItemForm}.tsx · frontend/src/pages/settings/settingsValues.ts · frontend/src/components/settings/{PersonnesSection,PersonForm,PersonSignatureSection,SignatureImageField}.tsx · frontend/src/components/settings/signatureUpload.ts · frontend/src/lib/validation.ts · frontend/src/i18n/resources/{fr,en}.ts · frontend/src/pages/settings/{LmnpPage,EmployeeSection,ExpenseItemForm,ExpenseItemsManager}.test.tsx · frontend/src/components/settings/{PersonnesSection,PersonForm,PersonSignatureSection}.test.tsx · frontend/src/lib/validation.test.ts
Affected tests: the 8 test files above · frontend/src/pages/settings/{CompanyLeaseTab,SettingsPage,CompanyLeaseStatementModal}.test.tsx · frontend/src/router.test.tsx · full frontend suite · full E2E
Symbols: LmnpPage · EmployeeSection/EmployeeForm · ExpenseItemsManager/ExpenseItemForm · PersonnesSection/PersonForm/PersonSignatureSection · settingsValues · employeeSchema/personSchema/expenseItemSchema
## Constraints
FR byte-identical (wording incl. guillemets `« »`, typographic apostrophes, plurals, `data-cy`/`dataCy`) · EN names items naturally ("Employee", "Expense item", "Person", "Signature", "Landlord", "Tenant") per the Task 43–46 precedent; FR keeps "Salarié", "Poste/Frais", "Personne", "Signature", "Bailleur", "Locataire" · module-level constants must not freeze translations: `LmnpPage` TABS move inside the component; `PERIODICITIES`/`EMPLOYEE_TITLES`/`employeeTitleLabel` in `settingsValues.ts` resolve labels at call time and their consumers use the new accessors · only `employeeSchema`, `personSchema`, `expenseItemSchema` become language-aware, re-evaluated per parse (Zod 4 function errors); `llmSchema` stays French · `signatureUpload.ts` messages resolve at call time (used by `PersonSignatureSection`) · `formatDate`/`formatEUR`/`formatMonth`/`formatPeriod`/`formatPercentage` untouched · keep the pre-existing FR label `"Ajouter un frais de frais"` byte-identical (do not fix the typo here; report it) · `ExpenseItemSwitchField` and `FileDropzone` need no change · no `any`, no money logic, no secrets · builder commits once, explicit paths, no push
## Acceptance
- No hardcoded French UI text remains in the 13 writable production files except dynamic data, placeholders that are French data examples, and the FR bundle; every label, help, placeholder, aria-label, toast, empty state, table header and dialog string uses `t()`.
- In EN the LMNP page, employees, expense items, persons and signature sections read English; switching FR↔EN relabels tabs, periodicity/title labels and all messages without reload.
- FR output is byte-identical to base for every changed string, including `signature(s)` plurals, guillemet dialogs, the `Ajouter un frais de frais` title and every `data-cy`.
- `employeeSchema`, `personSchema` and `expenseItemSchema` messages follow the language at parse time in both `zodResolver` and `safeParse`; `llmSchema` keeps French.
- Existing FR tests stay green; new EN tests cover LMNP tabs/header, employees (list/form/toasts/validation), expense items (table/form/dialog), persons and signatures (upload errors, toasts, list), plus `signatureUpload`.
- Frontend diff coverage >= 80%; full E2E green.
## Commands
- cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build
- scripts/diff-coverage.sh f26c94f frontend
- full E2E once: docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress; then down -v --remove-orphans; if Docker unavailable set BLOCKED.
## Builder evidence
- Files: 22 frontend files (LmnpPage, employees, expense items, persons, PersonSignatureSection, SignatureImageField, signatureUpload, settingsValues, validation, resources fr/en, 8 test files).
- RED `PersonSignatureSection.test.tsx`: 5 failed | 9 passed (EN strings missing). GREEN: 14/14 after wiring `settings.signatures.*` in the component.
- `npx vitest run <8 targeted files>`: PASS 8 files, 110/110. `codegraph affected <14 files>`: 56 files; `npx vitest run <56>`: PASS 56 files, 709/709.
- `npm run test:coverage`: PASS 63 files, 744/744; all files 97.02% stmts, 97.13% lines, 90.07% branches.
- `scripts/diff-coverage.sh f26c94f frontend`: PASS 40 changed lines, 0 missing, 100% (12 production files).
- `npm run lint`: PASS. `npm run format:check`: PASS after `prettier --write` on 11 task files (format-only). `npm run build`: PASS, built in 1.49s.
- E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`: exit 0; 6 specs, 26/26 passed, no retries; `down -v --remove-orphans` exit 0.
- `git diff --check`: PASS.
- FR/EN key parity 766/766, 0 missing either side; FR wording byte-identical (`« »`, typographic apostrophes, ellipsis), `formatDate` and `data-cy` unchanged; pre-existing `Ajouter un frais de frais` typo preserved.
- Contract: none (no openapi, backend or `api/schema.ts` diff). Deviations: none.
- Commit: 39a07af 22 files +1270/-181
- 2026-10-27 lead: VERDICT: PASS (reviewer, round 1/2) — FR byte-identical incl. guillemets/plurals/typo/data-cy, TABS and settingsValues resolve at call time, only the 3 schemas localized (llmSchema FR), parity 170 keys each side; no blocker. Non-blocking: lib/validation.ts 339 lines (311 at base) to split in a later task.
- 2026-10-27 lead: DONE — user accepted.
