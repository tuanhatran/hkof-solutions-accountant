# 85 - REMOVE-NUMBER-UTILITY
Status: DONE
Branch: feat/85-remove-number-utility
Base: 8aeea24
Size: M
Round: 1/2
## Goal
Remove the custom `.number` utility (mono font, tabular nums) so every number uses the standard design typography; update the tests asserting that class. Out of scope: any other styling, `--font-mono`/`@apply font-mono`, class names merely containing "number", backend and contract.
## Files
Context (read only): `frontend/src/index.css` (`.number` block, only rule in `@layer utilities`), `frontend/src/lib/format.ts`
Writable: `frontend/src/index.css`; `frontend/src/pages/{rent-receipt/RentReceiptAmountFields.tsx,rent-receipt/RentReceiptAdditionalChargeRow.tsx,settings/EmployeeSection.tsx,settings/CompanyLeaseRow.tsx,settings/ExpenseItemsTable.tsx,templates/TemplateVersionsList.tsx,expense-statement/ExpenseLinesTable.tsx,expense-statement/ExpenseGenerationFooter.tsx,expense-statement/ExpenseAmountFields.tsx,expense-statement/RentReceiptNotice.tsx,history/StatementMonthPanel.tsx,history/RentReceiptMonthPanel.tsx}`; `frontend/src/components/settings/{LeaseSection.tsx,LeaseReceiptHistory.tsx,PersonnesSection.tsx}`
Affected tests (writable): `frontend/src/pages/settings/{ExpenseItemsManager.test.tsx,EmployeeSection.test.tsx,CompanyLeaseTab.test.tsx}`, `frontend/src/pages/templates/TemplatesCard.test.tsx`, `frontend/src/pages/history/HistoryPage.test.tsx`, `frontend/src/components/settings/{PersonnesSection.test.tsx,LeaseSection.test.tsx}`
Touched E2E: `00-settings`
## Constraints
Contract: none · Money: untouched · UI French · no `any` · builder commits once (explicit paths), nobody pushes
## Acceptance
- [ ] `.number` rule and its `@layer utilities` block removed; no standalone `number` class token remains in `frontend/src/**/*.tsx` or CSS
- [ ] `template-versions-number`, `history-versions-number`, `expense-items-table-number-cell`, `--font-mono` and `@apply font-mono` untouched
- [ ] `ExpenseItemsManager.test.tsx` keeps its right-alignment intent without `td.number`; other tests drop only `"number"` from `toHaveClass`
- [ ] full frontend suite, lint, format, build pass; changed-line coverage >= 80%; `make e2e 00-settings` passes
## Commands
`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`; `scripts/diff-coverage.sh 8aeea24 frontend`; `make e2e-up` once, then `make e2e 00-settings`
## Evidence
- Files changed: 23 (index.css + 15 components/pages, 7 tests); `--font-mono`, `@apply font-mono`, substring classes (`*-number`, `*-amount`) and all `data-cy` untouched.
- Red: `npx vitest run` 7 affected files -> 7 failed | 157 passed (old assertions vs stripped classes).
- Green: same 7 files -> 7 files | 164 tests passed.
- `codegraph affected <15 sources>` -> 19 test files, all 352 tests passed.
- `npm run test:coverage` PASS: 72 files / 986 tests; Clover written.
- `npm run lint` PASS; `npm run format:check` PASS ("All matched files use Prettier code style!"); `npm run build` PASS (built in 1.07s).
- `scripts/diff-coverage.sh 8aeea24 frontend` exit 0: "No lines with coverage information in this diff" (className-only edits).
- `make e2e-up` PASS; `make e2e 00-settings` exit 0: 00-settings.cy.ts 7 passing / 7, 0 failing. Stack left running.
- Final grep: no standalone `number` class token in `frontend/src/**/*.tsx`; no `.number` in CSS.
- Deviation: `LeaseSection.tsx` is 356 lines (pre-existing, only class tokens removed); handoff file left uncommitted per commit rules.
- Contract: none. Commit: eadb2ec 23 files +38/-63.
- 2026-10-30 lead: VERDICT: PASS (reviewer, round 1)
- 2026-10-30 lead: DONE — user accepted
