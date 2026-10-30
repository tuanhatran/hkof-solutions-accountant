# 84 - CROSS-USER-RENT-RECEIPT-STATEMENT

Status: TODO
Branch: feat/84-cross-user-rent-receipt-statement
Base: 77a9bf3
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

`cd backend && ./mvnw -B verify` · `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 77a9bf3 all` · `make e2e-up` once then `make e2e 02-expense-statement` (leave stack up; `make e2e-down` only after acceptance).

## Evidence

(Append one line per event; builder appends evidence and sets REVIEW)
