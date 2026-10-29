# 44
Status: DONE
Branch: feat/44-expense-statements-ui-i18n
Base: c0ed3c2
Size: L
Round: 1/2
## Goal
Make the expense-statement (note de frais) UI fully bilingual FR/EN with react-i18next: page, lines, amounts, attachment, preview, result, rent-receipt notice, AI analysis panel, LLM badge, file dropzone, analysis hook messages, `formatBytes` units and the expense form validation messages, while French remains byte-identical. Out of scope: history, settings/LMNP, templates, Admin IA, PDF templates/documents, API/contract, backend, other validation schemas and `formatPeriod`/`formatMonth`/`formatEUR`/`formatDate`.
## Files
Read: .handoff/tasks/{39 - I18N-FOUNDATION,43 - RENT-RECEIPTS-UI-I18N}.md · frontend/src/i18n/{index.ts,resources/fr.ts,resources/en.ts} · frontend/src/test/setup.ts · frontend/cypress/support/e2e.ts
Write: frontend/src/pages/expense-statement/{GenerateExpenseStatementPage,ExpenseStatementHeader,ExpenseEntryCard,ExpenseAmountFields,ExpenseTypeAndProRata,ExpenseLinesCard,ExpenseLinesTable,ExpenseGenerationFooter,ExpensePreviewPane,ExpenseResultCard,ReceiptAttachment,RentReceiptNotice}.tsx · frontend/src/pages/expense-statement/{useExpenseStatementPage,useExpenseStatementForm,useExpenseStatementAnalysis,useExpenseStatementCalculation,useExpenseStatementEditing}.ts · frontend/src/components/llm/{AnalysisPanel,LlmBadge}.tsx · frontend/src/components/llm/analysisConfidence.ts · frontend/src/components/forms/FileDropzone.tsx · frontend/src/hooks/useAnalysis.ts · frontend/src/lib/format.ts · frontend/src/lib/validation.ts · frontend/src/i18n/resources/{fr,en}.ts · frontend/src/pages/expense-statement/{GenerateExpenseStatementPage,useExpenseStatementPage}.test.tsx · frontend/src/components/llm/{AnalysisPanel,LlmBadge}.test.tsx · frontend/src/components/llm/analysisConfidence.test.ts · frontend/src/components/forms/FileDropzone.test.tsx · frontend/src/hooks/useAnalysis.test.ts · frontend/src/lib/{format,validation}.test.ts
Affected tests: the 9 test files above · full frontend suite · full E2E
Symbols: GenerateExpenseStatementPage · AnalysisPanel/LlmBadge/FileDropzone · useExpenseStatementPage · formatBytes · expenseSchema
## Constraints
Domain terms (Quittance, NoteFrais, LigneFrais, Justificatif, Parametres, Poste) stay French in UI · amounts stay `1 234,56 €` and dates `DD/MM/YYYY` (`formatEUR`/`formatDate`/`formatMonth`/`formatPeriod` untouched) · only `formatBytes` units become language-aware (FR `o/Ko/Mo` unchanged, EN `B/KB/MB`) · only `expenseSchema` messages become language-aware (evaluated per parse, Zod 4 function errors; other schemas untouched) · no `any` · no backend/API/contract change · no money logic · FR output byte-identical · builder commits once, explicit paths, no push
## Acceptance
- No hardcoded French UI text remains in the 24 writable production files except domain terms and dynamic data; every label, help, placeholder, aria-label, toast and hook message uses `t()`.
- In EN the page, lines, attachment, preview, result, notice, analysis panel, LLM badge, dropzone and toasts read English; domain terms stay French; amounts/dates render as before.
- `formatBytes` returns French or English units from the current language (FR unchanged, e.g. "1,5 Ko"; EN "1.5 KB"); all other formatters unchanged.
- Expense validation messages follow the current language at parse time in both `zodResolver` and `safeParse` paths; other schemas keep their French messages.
- Existing FR page/llm/dropzone/format/validation tests stay green; new EN tests cover page labels, analysis panel, dropzone, toasts, `formatBytes` and one validation error; E2E keeps its FR assertions.
- Frontend diff coverage >= 80%; full E2E green.
## Commands
- cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build
- scripts/diff-coverage.sh c0ed3c2 frontend
- full E2E once: docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress; then down -v --remove-orphans; if Docker unavailable set BLOCKED.
## Builder evidence
- Files: 24 production (12 components + 5 hooks, AnalysisPanel, LlmBadge, analysisConfidence, FileDropzone, useAnalysis, format, validation), fr/en resources, 9 tests.
- Red: 9 targeted test files FAIL `Test Files 9 failed (9)`, `Tests 10 failed | 162 passed (172)`.
- Green targeted: 9 files PASS, `Tests 172 passed (172)`; `codegraph affected` 54 files PASS, `Tests 646 passed (646)`.
- `npm run test:coverage`: PASS, `Test Files 63 passed (63)`, `Tests 694 passed (694)`; statements 96.98%, branches 90.08%, functions 94.78%, lines 97.1%.
- `npm run lint`: PASS exit 0. `npm run format:check`: PASS exit 0 after `prettier --write` on 6 changed files. `npm run build`: PASS exit 0.
- `scripts/diff-coverage.sh c0ed3c2 frontend`: PASS 97% (91 changed lines, 2 missing, min 80%).
- E2E: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` exit 0; `All specs passed!` 6 specs / 26 tests, 0 failures, 0 retries.
- E2E teardown: same command with `down -v --remove-orphans` exit 0.
- FR byte-identical: existing FR assertions in all 694 tests and E2E specs pass unmodified.
- Commit: 1a3c0b6 35 files +1148/-287
- Contract impact: none (no openapi/backend/generated schema change). Money unchanged.
- Deviation: EN names the domain documents naturally (Expense statement, Rent receipt, Receipt), following the accepted Task 43 precedent; FR strings are untouched.
- 2026-10-27 lead: VERDICT: PASS (reviewer, round 1/2) — c0ed3c2..1a3c0b6, FR byte-identical, 132/132 FR/EN key parity, no leftover French UI, no blocker; status USER_REVIEW.
- 2026-10-27 lead: DONE — user accepted.
