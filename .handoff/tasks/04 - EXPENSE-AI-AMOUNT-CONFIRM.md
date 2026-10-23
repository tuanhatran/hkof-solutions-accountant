# EXPENSE-AI-AMOUNT-CONFIRM

Status: DONE
Branch: feat/confirm-ai-amount
Size: M
Round: 0/2

## Goal

When the LLM extracts an amount, always pre-fill the « Montant TTC » box with it and require one explicit click on a check icon before the line can be added or saved. Out of scope: backend, contract, saved `amountSource`/`aiDetectedAmount` semantics.

## Files

Context (read): `frontend/src/components/AiBadge.tsx` (`badge-ia-detecte`), `frontend/src/pages/GenerateExpenseStatementPage.tsx` (`AiState` L92, extraction effect L436-510, edit prefill L560-590, submit L636-660, amount input L1245-1290, add button L1355)
Writable: `frontend/src/pages/GenerateExpenseStatementPage.tsx`, new `frontend/src/components/AmountConfirmButton.tsx` + its `.test.tsx`, `frontend/cypress/e2e/02-expense-statement.cy.ts`, `product_prompt.md` (data-cy list + rule)
Affected tests: `frontend/src/components/ProRataInput.test.tsx` (pattern only), cypress spec 02 (LLM analysis cases L185-270)

## Constraints

- Always overwrite the amount box with the detected amount (user's decision), even when something was typed; the value stays editable.
- Confirmation is required only while the displayed amount is still the AI proposal: typing in the box clears the AI badge and the requirement; an existing saved line re-opens as already confirmed; the `loyer` rent-receipt amount and manual entry never require it.
- UI state only: no client-side money computation, `amountSource`/`aiDetectedAmount` payload unchanged, no contract change.
- Check icon: real `<button type="button">`, `aria-label` and French hint, `data-cy="btn-confirmer-montant"`, confirmed state announced via `aria-live`.
- Unrelated dirty files in the worktree (`DefaultPrompt.java`, untracked `Signature_Bailleur.png`): never touch, revert or stage them.
- French UI, no `any`, no skipped or weakened test.

## Acceptance

- [ ] After analysis the box holds the detected amount even if it was not empty; no amount detected → no confirmation asked.
- [ ] While unconfirmed: add/save disabled, icon visible, short French hint; clicking enables the button and shows a confirmed state.
- [ ] Typing, rent amount, manual line and edit-of-saved-line never block on confirmation.
- [ ] `npm run typecheck`, `npm test`, `npm run build` and e2e spec 02 pass; no backend or OpenAPI change.

## Commands

- frontend: `cd frontend && npm run typecheck && npm test && npm run build`
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`

## Evidence

<!-- append only -->

### Builder — 2026-10-22

Files: `frontend/src/components/AmountConfirmButton.tsx` (new), `frontend/src/components/AmountConfirmButton.test.tsx` (new), `frontend/src/pages/GenerateExpenseStatementPage.tsx`, `frontend/cypress/e2e/02-expense-statement.cy.ts`, `product_prompt.md` (rule L16 + UI behavior L307 + `btn-confirmer-montant` in the data-cy list). No backend, no OpenAPI change.

- red: `npx vitest run src/components/AmountConfirmButton.test.tsx` → FAIL, "Failed to resolve import ./AmountConfirmButton" (0 test).
- green: same command → PASS 1 file / 2 tests (French hint + click, confirmed state + `aria-live`).
- PASS `cd frontend && npm run typecheck` (exit 0, no diagnostic).
- PASS `npm test` → 10 files / 52 tests passed, 0 failed.
- PASS `npm run build` → 2208 modules, built in 1.10 s; only the pre-existing >500 kB chunk warning.
- PASS e2e `docker compose -p homeofficeexpenses-e2e ... up --build --abort-on-container-exit --exit-code-from cypress` → exit 0, 5 specs, 20/20 tests; `02-expense-statement` 11/11 (new: overwrite of a typed amount, add disabled until `btn-confirmer-montant`, confirmed state, saved AI line re-opens confirmed).

Deviations: extraction skips the overwrite when the current type is `loyer` (rent amount stays locked to the monthly receipt); `saveExpense` also early-returns with a French toast if a submit bypasses the disabled button; no page-level Vitest test (would require mocking the whole hook tree — covered by e2e instead).

Worktree note: no `git add` was run by the builder, but `.git/index` now lists the handoff, `Signature_Bailleur.png`, the Cypress spec and the new components as staged (index rewritten during the session). `DefaultPrompt.java` stays unstaged and unmodified by this task.

Status: DONE

### Reviewer — 2026-10-22 (Round 1/2)

VERDICT: PASS — confirmation is pending only while the box holds the AI proposal (typing, rent, manual and saved-line paths clear or pre-confirm it, and the Enter-key path is guarded in `saveExpense`), the new Cypress assertions fail on pre-fix code, and no money/contract/`any`/template defect is introduced in the reviewed files.
