# 52 — PERIOD-COPY-DATES

Status: DONE
Branch: feat/52-period-copy-dates
Base: 6ba0a57
Size: M
Round: 1/2

## Goal
Move the month choice to one page-level control on both generation pages, replace technical generation copy with plain French/English, and show French-formatted echoes for native month/date inputs. Out of scope: custom pickers, a new global period store, breakpoint/`useMediaQuery` changes, terminology drift (Société/Entreprise, Template/Modèle, Postes/Frais), backend/contract/money/migration/LLM.

## Files
Context (read only): `.handoff/plans/50 - CABINET-UI-REVIEW.md` (A2, copy, display) · `frontend/src/lib/format.ts` (`formatDate`, `formatMonth`) · `frontend/src/pages/{rent-receipt/useRentReceiptPage,expense-statement/useExpenseStatementPage,expense-statement/useExpenseStatementEditing}.ts` · `frontend/cypress/support/e2e.ts` (`chooseMonth`)
Writable: `frontend/src/components/ui/MonthField.{tsx,css}` (new) · `frontend/src/pages/rent-receipt/{GenerateRentReceiptPage.tsx,GenerateRentReceiptPage.css,RentReceiptForm.tsx,RentReceiptPartyFields.tsx,RentReceiptPartyFields.css,RentReceiptAmountFields.tsx}` · `frontend/src/pages/expense-statement/{ExpenseStatementHeader.tsx,ExpenseStatementHeader.css,ExpenseEntryCard.tsx,ExpenseEntryCard.css,ExpenseGenerationFooter.tsx}` · `frontend/src/components/settings/LeaseReceiptModal.tsx` · `frontend/src/i18n/resources/{fr,en}.ts`
Writable tests: `frontend/src/components/ui/MonthField.test.tsx` (new) · `frontend/src/pages/rent-receipt/GenerateRentReceiptPage.test.tsx` · `frontend/src/pages/expense-statement/GenerateExpenseStatementPage.test.tsx` · `frontend/src/components/settings/LeaseReceiptModal.test.tsx`
Affected tests (codegraph, 8): `components/layout/AppShell.test.tsx` · `components/llm/LlmBadge.test.tsx` · `hooks/useDraftBlock.test.tsx` · `pages/expense-statement/GenerateExpenseStatementPage.test.tsx` · `pages/rent-receipt/GenerateRentReceiptPage.test.tsx` · `pages/settings/{CompanyLeaseStatementModal,CompanyLeaseTab}.test.tsx` · `router.test.tsx`

## Constraints
Contract: none. Keep exactly one visible `data-cy="select-mois"` per generation page (Cypress `chooseMonth` depends on it); keep all other `data-cy`; French UI + EN parity; no `any`, no client money, no backend; reuse the existing shared month state (`useStatementDraft`/`useRentReceiptDraft`), add no store; no breakpoint or `useMediaQuery` change; component CSS <300 lines; builder commits once with explicit paths, nobody pushes.
Design: `MonthField` props `{ id, label, value, onChange, error?, help?, dataCy?, inputProps? }`; render a visible label, native `type="month"`, and a `formatMonth(value)` echo with `aria-live="polite"`; compose `inputProps.onChange` before `onChange(value)` and keep the input controlled by `value`; rent page passes `value={c.values.month}` + `inputProps={c.register("month")}` + `error={c.errors.month?.message}`, expense header passes `value={c.month}` + `onChange={c.changeMonth}`. Date echoes use the existing `FieldGroup` `help` slot with `formatDate(value)` (no new markup). The header control must wrap at 375px without horizontal overflow.

## Acceptance
- [ ] Month badge replaced by `MonthField` in `GenerateRentReceiptPage` and `ExpenseStatementHeader`; the month inputs are removed from `ExpenseEntryCard` and `RentReceiptPartyFields` (the template selector then occupies its row, no empty half-column); changing the header month updates the draft, the rent period and the preview as before; the rent month validation error still displays; one visible `select-mois` per page.
- [ ] Native date inputs in `RentReceiptAmountFields` (period start/end, payment, issue) show a DD/MM/YYYY `formatDate` echo when filled; `LeaseReceiptModal` month shows a `formatMonth` echo; native widgets remain and no custom picker is added.
- [ ] Technical copy is gone from the generation UI: no "Étape 1", "Calcul backend", "recalcul automatique (300 ms)" or "calcul backend"; plain copies replace them in both locales with matching keys: `expenseStatement.footer.calculationNote` = "Montants recalculés automatiquement à chaque modification." / "Amounts recalculated automatically after each change."; `expenseStatement.footer.hintStaleCalculation` = "Mise à jour du calcul…" / "Recalculating…"; `rentReceipt.fields.estimatedTotalNote` and `expenseStatement.fields.retainedNote` lose the word "backend"; remove the unused `rentReceipt.form.step`/`backendBadge` and old `backendCalculation` keys.
- [ ] Tests: new `MonthField` test (label, echo, error, composed `inputProps.onChange`); page tests assert the header month control, month change, date echo and absence of the technical labels; `LeaseReceiptModal` test asserts the month echo; full suite green.
- [ ] gates pass; frontend changed-line coverage >= 80%; full E2E still passes `chooseMonth` and generation.

## Commands
- `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- `scripts/diff-coverage.sh 6ba0a57 frontend`
- full E2E once: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`, then `down -v --remove-orphans`; if Docker is unavailable set BLOCKED.

## Evidence
Files: 19 committed (MonthField .tsx/.css/.test.tsx; rent page/form/party/amount + test; expense header/entry/footer + test; LeaseReceiptModal + test; i18n fr/en).
RED MonthField.test.tsx (module missing) -> GREEN 5/5.
RED GenerateRentReceiptPage.test.tsx, 3 new tests (header month, date echoes, tech copy) -> GREEN 27/27.
RED GenerateExpenseStatementPage.test.tsx, 2 new tests (header month, tech copy) -> GREEN 20/20.
RED LeaseReceiptModal.test.tsx (month echo) -> GREEN 19/19.
PASS affected regression: 9 files / 177 tests; settings 5 files / 86 tests; graph 4 files / 31 tests.
PASS cd frontend && npm run test:coverage: 66 files, 795 tests, exit 0.
PASS npm run lint: exit 0.
PASS npm run format:check: exit 0 (6 files reformatted by prettier, then green).
PASS npm run build: exit 0 (2421 modules).
PASS scripts/diff-coverage.sh 6ba0a57 frontend: 100% changed lines (8/8, 0 missing).
PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`: exit 0, 6/6 specs, 26/26 tests, no retry.
PASS `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml down -v --remove-orphans`: exit 0.
Contract impact: none. Deviations: none.
Commit: f740247 19 files +399/-122
Round 1 reviewer: PASS — one visible select-mois per page, RHF month still composed with changeMonth, date echoes reuse FieldGroup help, FR/EN parity, no scope creep; diff coverage re-run 100% (8/8).
lead: DONE — user accepted
