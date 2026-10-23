# NOTE-COMPLETE-ZIP

Status: DONE · Branch: feat/note-complete-zip · Size: L · Round: 2/2

## Goal

"Télécharger la note complète (ZIP)" downloads a ZIP with the generated note PDF, the month's rent-receipt PDF and every expense justificatif in its original format; "note seule" stays the note-only PDF. User decision: prorata stays read-only in the added-expenses row, so align E2E spec 02 and `product_prompt.md` with that UI; do not restore the inline editor. Out of scope: merged full-PDF generation (kept for Ouvrir/complete preview), money, DB, migrations, template sandbox.

## Files

Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/service/StorageService.java` (`read`, `sanitizeName`), `backend/src/main/java/fr/hkof/homeofficeexpenses/service/RentReceiptService.java` (`activeForMonth`), `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/{ExpenseStatement,RentReceipt,Receipt}.java`, `frontend/src/api/client.ts` (`blobRequest`, `downloadBlob`).
Writable: `openapi/openapi.yaml`, `product_prompt.md`, `backend/src/main/java/fr/hkof/homeofficeexpenses/web/{ExpenseStatementController,PdfResponses}.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/service/ExpenseStatementService.java`, `backend/src/test/java/fr/hkof/homeofficeexpenses/web/ApiIntegrationTest.java`, `frontend/src/api/{endpoints.ts,schema.ts}`, `frontend/src/pages/{GenerateExpenseStatementPage,HistoryPage}.tsx`, `frontend/src/pages/GenerateExpenseStatementPage.test.tsx`, `frontend/cypress/e2e/{02-expense-statement,03-statement-finalization}.cy.ts`, `frontend/cypress/support/helpers.ts`, `frontend/cypress.config.ts`, `frontend/package.json` + `frontend/package-lock.json` (only if a ZIP reader is added).
Routes/symbols: new `GET /api/expense-statements/{id}/zip` in `ExpenseStatementController`; new `ExpenseStatementService.zip` beside `withAttachments`/`generate`/`pdf`; new `PdfResponses` attachment helper; `api.expenseStatements.zip`/`zipUrl`; `downloadStatement` (Generate page) and `ActionsPdf` (History).
Affected tests (`codegraph affected`): `ApiIntegrationTest`, `ExpenseStatementActiveIntegrationTest`, `SignatureControllerIntegrationTest`, `queries.test.ts`, `SignaturesManager.test.tsx`, `GenerateExpenseStatementPage.test.tsx`, `GenerateRentReceiptPage.test.tsx`; E2E `03-statement-finalization.cy.ts`.

## Constraints

Contract: `openapi/openapi.yaml#/paths/~1api~1expense-statements~1{id}~1zip` (new GET, `200 application/zip`, `format: binary`); YAML first, then `npm run gen:api`; existing `/pdf` untouched. ZIP entries: `note_frais_<YYYY-MM>.pdf` (stored statement PDF), `quittance_<YYYY-MM>.pdf` (active receipt, omit if none), `justificatifs/<NN>_<sanitized original name>` (statement line order, dedupe by receipt id, UTF-8, no traversal); attachment `note_frais_<YYYY-MM>_complet.zip`. Merged full PDF stays for Ouvrir/complete preview. Money: none · UI French · no `any` · no commit/push/reset/clean/stash.

## Acceptance

- [x] Red first backend: `ApiIntegrationTest` unzips the response and finds the note PDF, quittance PDF and original `facture-gaz.txt`; a duplicated receipt appears once; note-only PDF still has no annexes.
- [x] "Télécharger la note seule" → `note_frais_<month>.pdf` (no annexes); "Télécharger la note complète (ZIP)" → `note_frais_<month>_complet.zip`; History "Note complète (ZIP)" downloads the ZIP while "Ouvrir" still opens the merged PDF; complete preview unchanged.
- [x] Contract YAML first, `npm run gen:api` regenerates `schema.ts`, and `product_prompt.md` describes the ZIP download; French label exact.
- [x] Spec 02: remove the inline `[aria-label="Prorata de Gaz"]` edit, assert the read-only `35,71 %` row display, keep add/delete totals; `product_prompt.md` line 257 documents read-only prorata.
- [x] Backend, frontend and full E2E gates green with exact counts; E2E reads the ZIP entries; no test passes only on a retry.

## Commands

- backend: `cd backend && ./mvnw -B test` · frontend: `cd frontend && npm run gen:api && npm run typecheck && npm test && npm run build` · e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`

## Evidence

- 2026-10-23 builder: files — `openapi/openapi.yaml`, `product_prompt.md`, `PdfResponses`, `ExpenseStatementController`, `ExpenseStatementService`, `ApiIntegrationTest`, `frontend/src/api/{endpoints.ts,schema.ts}`, `GenerateExpenseStatementPage(.test).tsx`, `HistoryPage.tsx`, `cypress.config.ts`, `cypress/support/helpers.ts`, `03-statement-finalization.cy.ts`, `package.json`+lock (`yauzl`, `@types/yauzl`).
- RED backend `./mvnw -B -Dtest=ApiIntegrationTest#expenseStatementZipBundlesDocuments test`: 404, Tests run 1, Failures 1. GREEN after implementation: 1/1.
- RED frontend `npx vitest run src/pages/GenerateExpenseStatementPage.test.tsx`: fallback `note_frais_2026-01_v1.pdf` != `note_frais_2026-01.pdf`; GREEN: 5/5 in file.
- PASS `cd backend && ./mvnw -B test`: Tests run 128, Failures 0, Errors 0, Skipped 2, BUILD SUCCESS (exit 0).
- PASS `cd frontend && npm run gen:api && npm run typecheck && npm test && npm run build`: gen ok, typecheck exit 0, 12 files / 70 tests passed, build exit 0.
- FAIL E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`: exit 1, 5 specs / 20 passed, 1 failed (retry 2/2 also failed) — `02-expense-statement.cy.ts:365` `[aria-label="Prorata de Gaz"]` not found. Spec 03 (ZIP) PASS 1/1: note PDF, quittance PDF, `justificatifs/01_facture-gaz.txt`, 5 justificatifs.
- E2E root cause: pre-existing at HEAD `ec76918` — that commit removed `ProRataInput`/`changeProRata` from `GenerateExpenseStatementPage.tsx` while spec 02 still targets the inline editor; not caused by this task and spec 02 is outside the writable list.
- Teardown same compose command with `down -v --remove-orphans`: exit 0. `codegraph sync`: done. `codegraph affected`: 8 files (backend 4, frontend 4) all run in the full gates.
- Contract: added `openapi/openapi.yaml#/paths/~1api~1expense-statements~1{id}~1zip` (GET `getExpenseStatementZip`, 200 `application/zip`, `string/binary`); `/pdf` untouched; `schema.ts` regenerated via `npm run gen:api`.
- ZIP: `note_frais_<YYYY-MM>.pdf` + `quittance_<YYYY-MM>.pdf` (active receipt, omitted if none) + `justificatifs/<NN>_<sanitized name>` (line order, dedupe by receipt id, UTF-8, no traversal); attachment `note_frais_<YYYY-MM>_complet.zip`; merged full PDF and complete preview unchanged (Ouvrir).
- Blocked: full E2E must be green; the only failing test predates this task and its fix (restore inline pro-rata editor or update spec 02) is outside this handoff. No commit/push/reset/clean/stash.
- 2026-10-23 lead: reviewer `VERDICT: BLOCKED` (round 1) — no blocker in the ZIP feature; only the pre-existing `02-expense-statement.cy.ts:365` inline prorata mismatch blocks the all-green gate.
- 2026-10-23 lead: `USER_CHANGES_REQUESTED` — user confirmed prorata stays read-only in the row; update spec 02 and `product_prompt.md`, then rerun the full E2E suite (Round reset to 0).
- 2026-10-23 builder r2: files — `frontend/cypress/e2e/02-expense-statement.cy.ts` (test renamed "updates the preview on each add and removal"; inline `[aria-label="Prorata de Gaz"]` edit + `1 010,00` waits removed; added `ligne-frais-gaz` contains "35,71 %"; add `992,85`, delete and return `950,00` kept), `product_prompt.md:257` (prorata read-only). ZIP code untouched.
- RED→GREEN spec 02: round-1 run failed at `02-expense-statement.cy.ts:365` (`[aria-label="Prorata de Gaz"]` missing); green this run with no retry.
- PASS `cd frontend && npm test && npm run typecheck && npm run build`: 12 files / 70 tests passed, typecheck exit 0, build exit 0.
- PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`: exit 0, first attempt, 5 specs / 21 tests, 21 passed, 0 failed, 0 skipped, 0 retries (02: 12/12, 03: 1/1).
- PASS teardown same compose with `down -v --remove-orphans`: exit 0. `codegraph sync`: done (1 file). Contract impact: none. No commit/push/reset/clean/stash.
- 2026-10-23 lead: reviewer `VERDICT: PASS` (round 2) — read-only prorata delta confined to spec 02 + `product_prompt.md`; untouched ZIP feature retains round-1 clearance; full E2E first attempt 5 specs / 21 tests, 0 failed/0 skipped/0 retries. Status `USER_REVIEW`; awaiting user acceptance.
- 2026-10-23 lead: DONE — user accepted
