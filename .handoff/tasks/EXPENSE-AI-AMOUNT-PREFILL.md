# EXPENSE-AI-AMOUNT-PREFILL

Status: DONE
Branch: main (deviation: recorded `feat/confirm-ai-amount` was merged as `40a5f4c`; user checked out `main` and asked to continue there. No second branch created.)
Size: M
Round: 1/2

## Goal

Whatever the currency spelling, every detected amount must prefill « Montant TTC » and stay in all numeric formats (`74,6`, `74.60`, `1 234,56`). Today nothing is filled in when the model answers `devise: "€"`.

## Root cause (evidence from the running stack)

`document_analysis` id 13 for `F5740032447.pdf`: `"amountInclVat":"74.60"`, `"currency":"€"`, confidence `haute`. Frontend `GenerateExpenseStatementPage` (~L449) does `extraction.currency.toUpperCase() !== "EUR" → suggestedAmount = null`, so the amount is never applied. The analysis-panel badge is fed by `result.sourceExcerpt`, which is why the user sees « Détecté par IA » with an empty box.

Secondary, also wanted ("all formats"): `ExtractionPipeline.presentInDocument` only accepted the 2-decimal literal form, so a document writing `74,6` was rejected. Fix already drafted in the worktree by the cancelled builder: keep it.

## Files

Writable: `backend/src/main/java/fr/hkof/homeofficeexpenses/service/llm/ExtractionPipeline.java` (`presentInDocument` L240, currency normalization L117-120), `backend/src/test/java/fr/hkof/homeofficeexpenses/service/llm/ExtractionPipelineTest.java`, `frontend/src/pages/GenerateExpenseStatementPage.tsx` (~L449 gate), `frontend/src/lib/format.ts` (new `isEuroCurrency` helper) + `frontend/src/lib/format.test.ts`, `frontend/cypress/e2e/02-expense-statement.cy.ts`, `frontend/cypress/fixtures/facture-fibre-74-6.txt`, `mock-ollama/server.js`
Keep as-is: analysis-panel sentence already corrected.

## Constraints

- Currency: backend normalizes `€`, `EUR`, `euro`, `euros`, `Eur `, empty/null → `EUR` (trim + upper); a genuinely foreign code (`USD`, `CHF`) is preserved and may block the prefill. Frontend mirrors the same tolerance so already-stored analyses with `"€"` work.
- Amount formats: digit-bounded match, never `174.6` for `74.60` nor `74.65`; no money rule touched, no `double`.
- `mock-ollama` returns `devise: "€"` when the uploaded text contains `€`, `EUR` otherwise, so the E2E reproduces the real model.
- No contract change; French user-facing strings; no test weakened.
- Unrelated dirty files (`DefaultPrompt.java`, `Signature_*.png`, staged files): never touch.

## Acceptance

- [ ] Backend: one-decimal kept, `€` normalized to `EUR`, `USD` preserved, `174,6`/`74,65` still rejected (red first).
- [ ] Frontend: `isEuroCurrency` accepts `EUR`, `€`, `euro`, ` EUR `, null and rejects `USD` (red first).
- [ ] Cypress: upload `facture-fibre-74-6.txt` (`74,6 €`) → box shows `74.60`, `btn-confirmer-montant` visible; existing 39,99 case still green.
- [ ] Gates pass with real counts.

## Commands

- backend: `cd backend && ./mvnw -B test`
- frontend: `cd frontend && npm run typecheck && npm test && npm run build`
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`

## Evidence

<!-- append only -->

- `2026-10-23 lead:` resumed on `main` — recorded branch already merged (`40a5f4c`); `presentInDocument` one-decimal fix present; remaining gaps = currency normalization (backend + `isEuroCurrency`), `mock-ollama` `devise: "€"`, Cypress `74,6 €` case.
- `2026-10-23 builder:` red backend → `ExtractionPipelineTest.euroSpellingsNormalized` expected: "EUR" but was: "€" (line 107).
- `2026-10-23 builder:` red frontend → `src/lib/format.test.ts` `TypeError: isEuroCurrency is not a function` (3 tests failed, 7 passed).
- `2026-10-23 builder:` `cd backend && ./mvnw -B test` Tests run: 68, Failures: 0, Errors: 0, Skipped: 1 (TemplateActivationPostgresTest, pre-existing) PASS.
- `2026-10-23 builder:` `cd frontend && npm run typecheck` PASS (no output, exit 0).
- `2026-10-23 builder:` `cd frontend && npm test` Test Files 10 passed, Tests 55 passed PASS.
- `2026-10-23 builder:` `cd frontend && npm run build` built in 493 ms PASS (chunk-size warning only).
- `2026-10-23 builder:` `npx tsc --noEmit -p cypress/tsconfig.json` PASS.
- `2026-10-23 builder:` `mock-ollama` smoke: `74,6 €` → `devise:"€"`, `120,00 EUR` → `devise:"EUR"` PASS.
- `2026-10-23 builder:` e2e NOT RUN — `docker` unavailable in this WSL 2 distro; new Cypress `€` case and existing AI cases stay unverified until Docker is available.
- `2026-10-23 reviewer:` `VERDICT: PASS` (round 1), no blocker; notes: E2E still to run, `mock-ollama` checks `€` on the whole message, euro spellings duplicated backend/frontend.
- `2026-10-23 lead:` re-ran gates — backend `Tests run: 68, Failures: 0, Errors: 0, Skipped: 1`; frontend typecheck OK, `Tests 55 passed (55)`, build OK.
- `2026-10-23 lead:` `DONE — user accepted`
