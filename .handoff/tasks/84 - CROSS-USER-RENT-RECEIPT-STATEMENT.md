# 84 - CROSS-USER-RENT-RECEIPT-STATEMENT

Status: DONE
Branch: feat/84-cross-user-rent-receipt-statement
Base: c12911b
Size: L
Round: 0/2

## Goal

Allow rent receipts issued by a landlord user for a corporate tenant (Company ABC) to be queried and automatically bundled by the company owner in Company ABC's expense statements (ExpenseStatementService), include the rent receipt PDF as justificatif in the export bundle, and display issued receipts for the landlord and received receipts for the company owner in the UI. Out of scope: payment processing, external electronic signature providers.

## Files

Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/RentReceipt.java,domain/ExpenseStatement.java,service/RentReceiptService.java,service/ExpenseStatementService.java,service/ExpenseStatementDocumentService.java}`, `frontend/src/pages/history/HistoryPage.tsx`.
Routes: `GET /api/rent-receipts`, `GET /api/rent-receipts/{id}/pdf`, `POST /api/expense-statements`, `GET /api/expense-statements/{id}/bundle`.
Writable backend: `backend/src/main/resources/db/migration/V28__cross_user_rent_receipt.sql`; `backend/src/main/java/fr/hkof/homeofficeexpenses/{repository/RentReceiptRepository.java,service/RentReceiptService.java,service/ExpenseStatementService.java,service/ExpenseStatementDocumentService.java,web/RentReceiptController.java,web/ExpenseStatementController.java}`; `backend/src/test/java/fr/hkof/homeofficeexpenses/{service/RentReceiptServiceTest.java,service/ExpenseStatementServiceTest.java,service/ExpenseStatementDocumentServiceTest.java,web/RentReceiptCrossUserIntegrationTest.java,web/UserDocumentIsolationIntegrationTest.java}`.
Writable frontend: `frontend/src/pages/history/HistoryPage.tsx`, `frontend/src/pages/history/HistoryPage.css`, `frontend/src/pages/history/HistoryPage.test.tsx`, `frontend/src/pages/expense-statement/GenerateExpenseStatementPage.tsx`, `frontend/cypress/e2e/05-multi-company.cy.ts`.
Affected tests: `backend/src/test/java/fr/hkof/homeofficeexpenses/web/{ExpenseStatementActiveIntegrationTest.java,UserDocumentIsolationIntegrationTest.java,MultiLeaseExpensesIntegrationTest.java}`.
Touched E2E: `02-expense-statement`

## Constraints

Contract: none or minor DTO enhancement (counterparty label on history items); if contract modified, run `npm run gen:api`. Money: `CalculationService` only (`BigDecimal`, `HALF_UP`, scale 2). Rent amount from the landlord's rent receipt must match the expense line calculation exactly. Security & Privacy: company owner can read/download only the rent receipts generated for their owned company; company owner cannot access landlord's other receipts, leases, or private persons. Landlord cannot view company's expense statements or other expense items. PDF & ZIP: `ExpenseStatementDocumentService` includes `quittance_<month>.pdf` from the landlord's generated receipt into the company's ZIP and merged PDF. Production classes < 300 lines; builder commits once with explicit paths; nobody pushes.

## Acceptance

- [ ] Landlord user generates a rent receipt for Company ABC for month M.
- [ ] Company owner user drafts an expense statement for Company ABC for month M: the rent receipt is detected, amount is populated, and the rent receipt PDF is included in the ZIP/bundle export.
- [ ] Company owner can view and download the rent receipt from the Company ABC history; company owner cannot view landlord's other receipts.
- [ ] Landlord can view the rent receipt in issued history; landlord cannot view company owner's expense statements.
- [ ] Backend verify passes, frontend tests pass, changed-line coverage >= 80%, Cypress `02-expense-statement` passes; production classes < 300 lines.

## Commands

`cd backend && ./mvnw -B verify` · `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh c12911b all` · `make e2e-up` once then `make e2e 02-expense-statement`, `make e2e 01-rent-receipt`, `make e2e 03-statement-finalization`, `make e2e 05-multi-company` (receipt/statement/bundle regression; leave stack up; `make e2e-down` only after acceptance).

## Evidence

(Append one line per event; builder appends evidence and sets REVIEW)

- Files: 25 committed (backend received service + controller/repo/mapper/service/filter, V28 index, 2 new tests, RentReceiptServiceTest; openapi + regen schema, api hooks/types, HistoryPage/RentReceiptMonthPanel/historyHelpers, GenerateExpenseStatementPage, i18n fr/en, tests).
- PASS `cd backend && ./mvnw -B verify`: 642 tests, 0 failures, 1 skipped, BUILD SUCCESS (Jacoco written). PASS frontend `npm run test:coverage`: 72 files, 986 tests, 0 failed; `npm run lint`, `npm run format:check`, `npm run build`: all exit 0.
- PASS `scripts/diff-coverage.sh c12911b all`: backend 97% (72 changed lines, 2 missing), frontend 100% (14 lines).
- RED then GREEN: `RentReceiptReceivedServiceTest.receivedList/.receivedPdf` failed (2) with company scope + tenant-company ownership filters neutralized; integration `$.rentReceipt.id` missing with the `activeForMonth` received fallback disabled (detection + CalculationService amount); integration ZIP lacked `quittance_2026-09.pdf` with document bundling disabled. Restored files sha256-identical, then green: 2+25+1+3 tests pass.
- PASS E2E first run, exit 0 each, stack left up: `make e2e 02-expense-statement` 12/12; `make e2e 01-rent-receipt` 2/2; `make e2e 03-statement-finalization` 1/1; `make e2e 05-multi-company` 2/2.
- Contract impact: `openapi/openapi.yaml` adds `GET /api/rent-receipts/received` and `GET /api/rent-receipts/received/{id}/pdf`; `frontend/src/api/schema.ts` regenerated via `npm run gen:api` (not hand-edited).
- Deviation (cross-block): `ModuleAccessFilter` exempts only `/api/rent-receipts/received*` from the LMNP gate so company-only owners can read/download their company receipts; `/api/rent-receipts`, `/{id}`, `/{id}/pdf`, `/active`, `/api/persons`, `/api/leases` stay 403 (asserted).
- Deviation: prior run reused SIREN 987654321, colliding with UserIsolationIntegrationTest in the shared test DB; cross-user test now uses 741852963. One full verify hit a Testcontainers port-forward flake (RentReceiptMultiMigrationPostgresTest); class green alone and full verify green on rerun. PageHeader.css left untouched/uncommitted (pre-existing dirty).
- Commit: 9616be9 25 files +1063/-29
- 2026-10-30 lead: `VERDICT: PASS` (reviewer, round 1) — ownership-scoped received list/PDF, detection/bundling proven end-to-end (`quittance_2026-09.pdf` byte-equal to received PDF, draft line = receipt total), V28 indexes existing columns, contract updated + schema regenerated, production classes < 300; Testcontainers port-forward failure judged environmental (pre-existing class, clean full `verify` rerun 642/0/1).
- 2026-10-30 lead: `DONE — user accepted`
