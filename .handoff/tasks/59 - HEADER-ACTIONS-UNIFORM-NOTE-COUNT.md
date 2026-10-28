# 59 - HEADER-ACTIONS-UNIFORM-NOTE-COUNT

Status: DONE
Branch: feat/59-header-actions-uniform-note-count
Base: 18a33ef
Size: M
Round: 0/2

## Goal
Unify the design of every direct child of `.page-header-actions` on all pages (same height, same min-width with longer content allowed to grow, square non-round borders, consistent border weight/colour) and verify the history month badge "Note (N)" shows the true total of expense-statement versions of the month (user example: 5), fixing any undercount. Out of scope: `.history-month-section-badges` pills, `.expense-statement-header-banner-actions`, backend, `openapi/openapi.yaml`.

## Files
Context (read only): `frontend/src/components/layout/PageHeader.tsx`, `frontend/src/components/ui/Button.tsx`, `frontend/src/components/ui/MonthField.tsx`, `frontend/src/index.css` (btn/field/badge primitives), symbols `page-header-actions`, `HistoryMonthSection.noteCount`, `groupHistoryByMonthAndAddress`, `useAllStatements`
Writable: `frontend/src/components/layout/PageHeader.css`, `frontend/src/pages/expense-statement/ExpenseStatementHeader.css`, `frontend/src/pages/expense-statement/ExpenseStatementHeader.tsx`, `frontend/src/components/ui/MonthField.css`, `frontend/src/pages/history/HistoryMonthSection.tsx`, `frontend/src/pages/history/historyHelpers.ts`, `frontend/src/api/queries.ts`
Affected tests: `frontend/src/pages/history/HistoryPage.test.tsx`, `frontend/src/pages/history/historyHelpers.test.ts`, `frontend/src/components/ui/MonthField.test.tsx`, `frontend/src/pages/expense-statement/GenerateExpenseStatementPage.test.tsx`

## Constraints
Contract: none · Money: none · UI French · no `any` · builder commits once (explicit paths), nobody pushes · keep the uncommitted company-label removal in `ExpenseStatementHeader.tsx/.css` (include it in the commit, never revert) · CSS: tokens or `@apply` only, rules in `@layer components`, colocated-CSS convention

## Acceptance
- [ ] every direct child of `.page-header-actions` (history, expense-statement, rent-receipt, admin-llm pages) renders at equal height, a shared min-width (longer content may grow), square borders with consistent weight/colour
- [ ] history month note badge counts every statement version returned for the month across companies/addresses (unit test: 5 statements → "Note (5)"); any undercount in fetching/grouping is fixed
- [ ] gates per Commands pass; if production TSX changed: changed-line coverage >= 80% vs 18a33ef; component CSS < 300 lines

## Commands
- CSS/tests only: affected tests + `cd frontend && npm run lint && npm run format:check && npm run build`
- production TSX: `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` + `scripts/diff-coverage.sh 18a33ef frontend` + `make e2e-up` once then `make e2e` (E2E skipped only if the final diff is CSS/tests-only, gate table)

## Evidence
Append one line per event; never rewrite a previous line.
- Files: 6 committed (PageHeader.css, MonthField.css, ExpenseStatementHeader.css/.tsx, HistoryPage.test.tsx, historyHelpers.test.ts).
- Red→green: GenerateExpenseStatementPage "Société concernée" combobox lost its accessible name once the user's label removal was included; fixed with `aria-label` on the select, no test weakened. 2 failed → 24/24.
- PASS affected tests (11 files, codegraph affected): 139/139 green after that fix.
- PASS `npm run lint`, `npm run format:check`, `npm run build` (pre-existing >500 kB chunk warning).
- PASS `npm run test:coverage`: 67 files, 851 tests, lines 96.9%.
- PASS `scripts/diff-coverage.sh 18a33ef frontend`: exit 0, "no lines with coverage information" (only CSS and JSX attribute lines changed).
- PASS `make e2e` on the existing e2e stack: 6 specs, 26/26 tests, no retry; stack left up.
- Note count: 5 statement versions (archived + active) → "Note (5)" and 5 rows; helper keeps all 5 in one address row. No undercount reproduced in `useAllStatements` (per company, no month filter) or in grouping, so those files stay untouched.
- Header uniformity: one rule `.page-header .page-header-actions > *` (36 px height, shared 9.5 rem min-width that still grows, square corners, `border-line`); month wrapper and company select made frame-less inside, month error/hint positioned under the box. Not asserted by a browser test.
- Deviation: `HistoryMonthSection.tsx`, `historyHelpers.ts`, `queries.ts` unmodified (no undercount to fix). Contract: none.
- Commit: 8ba2ea9 6 files +57/-16. No reviewer round: builder executed as a single agent at the user's request.
- Status: REVIEW.
