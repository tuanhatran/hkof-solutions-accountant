# EXPENSE-AI-AMOUNT-PREFILL

Status: TODO
Branch: feat/confirm-ai-amount (same feature branch, reused; no second branch)
Size: M
Round: 0/2

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
