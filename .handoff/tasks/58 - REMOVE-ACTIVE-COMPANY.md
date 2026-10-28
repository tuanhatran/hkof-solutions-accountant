# 58 — REMOVE-ACTIVE-COMPANY

Status: DONE
Branch: feat/58-remove-active-company
Base: 7aee25f
Size: L
Round: 0/2

## Goal
Remove the global/persisted "Société active" (topbar switcher, Zustand store): a rent receipt takes its company only from the lease (person lease → none, PDF `lieu` from the landlord's new issue place), and "Note de frais" picks its company locally in the page header (0 companies → empty state with a link to Configuration; 1 → read-only chip; several → explicit "Choisir une société", no default). Out of scope: calculation rules, PDF layout, routes, unrelated settings UI.

## Files
Context (read only): `frontend/src/api/queries.ts` (`useActiveRentReceipt`, `useActiveStatement`, `useExpenseItems`, `useEmployees`) · `frontend/src/pages/rent-receipt/rentReceiptRequest.ts` · `backend/src/main/java/fr/hkof/homeofficeexpenses/service/{CompanyService.java,LeaseService.java}` · `.../config/DataInitializer.java` · `frontend/cypress/support/e2e.ts`
Writable (frontend): `frontend/src/state/{company.ts,company.test.ts}` (delete) · `frontend/src/components/layout/{AppShell.tsx,CompanySwitcher.tsx,CompanySwitcher.css,CompanySwitcher.test.tsx}` (switcher files delete) · `frontend/src/pages/expense-statement/{useExpenseStatementContext.ts,useExpenseStatementPage.ts,expenseStatementTypes.ts,GenerateExpenseStatementPage.tsx,ExpenseStatementHeader.tsx,ExpenseStatementHeader.css,useExpenseStatementForm.ts}` · `frontend/src/state/statementDraft.ts` · `frontend/src/pages/rent-receipt/{useRentReceiptPage.ts,GenerateRentReceiptPage.tsx}` · `frontend/src/components/settings/{useLeaseReceiptModal.ts,PersonForm.tsx}` · `frontend/src/pages/settings/CompanySection.tsx` · `frontend/src/pages/history/HistoryPage.tsx` · `frontend/src/lib/validation.ts` · `frontend/src/i18n/resources/{fr,en}.ts`
Writable (backend): `.../domain/Person.java` · `.../web/dto/RentConfigurationDtos.java` · `.../service/{PersonService.java,RentReceiptService.java}` · `.../service/template/TemplateDataService.java` · `.../service/E2eResetService.java` · `.../resources/db/migration/V13__person_issue_place.sql` (new)
Contract: `openapi/openapi.yaml` (`#/components/schemas/PersonRequest`, `#/components/schemas/PersonDto`, `RentReceiptRequest.companyId`, `/api/rent-receipts/active` companyId descriptions); regenerate `frontend/src/api/schema.ts` with `npm run gen:api`.
Affected tests (codegraph): backend `PersonServiceTest`, `RentReceiptServiceTest`, `TemplateDataServiceTest`, `ApiIntegrationTest`, `CompanyLeaseIntegrationTest`, `E2eResetIntegrationTest`; frontend `AppShell`, `GenerateExpenseStatementPage`, `useExpenseStatementPage`, `HistoryPage`, `useRentReceiptPage`, `GenerateRentReceiptPage`, `LeaseReceiptModal`, `PersonForm`, `PersonnesSection`, `LmnpPage`, `SettingsPage`, `CompanySection`, `validation`, `statementDraft`, `router`; full suites are the gate. E2E `00-settings`, `01-rent-receipt`, `05-multi-company`.

## Constraints
- Landlord issue place: nullable `person.issue_place VARCHAR(255)` (migration V13 only), `issuePlace` on `PersonRequest`/`PersonDto`, trimmed/blank→null in `PersonService`; `TemplateDataService` `lieu` = landlord issuePlace → company issuePlace → `""`, null-safe.
- Person lease: `RentReceiptService.resolveCompany` returns null when the lease has no company and no request company; `fill` supports a null company (no `COMPANY_REQUIRED`); company lease still wins over `requestCompanyId`. Frontend: `receiptCompanyId = selectedLease?.companyId ?? null`, `companyName = selectedLease?.companyName ?? null`, same in `useLeaseReceiptModal`; no fallback anywhere, no company chip for a person lease.
- Note de frais: no global store/persist; page-local `selectedCompanyId` (`options.companyId` initializes it for the scoped modal and History reload via `navigate(..., { state: { companyId } })`), auto-select only when exactly one company, otherwise explicit choice; company-scoped queries disabled until chosen; reset form/upload/result on A→B. Keep existing `data-cy`; add `select-societe-note-frais` / `societe-note-frais`.
- Draft scope per `(companyId, month)` in `statementDraft`: switching company never shows or submits another company's lines; bump persist version and migrate/reset old month-only state. Delete `useCompanyStore`/`resolveActiveCompanyId`/`shell.activeCompany`; topbar keeps LlmBadge + LanguageSelector; CompanySection selection stays local.
- UI French · no `any` · no client-authoritative amount · money untouched · classes and component CSS < 300 lines · builder commits once (explicit paths), nobody pushes · update README "Assumptions" line 161.

## Acceptance
- [ ] No `select-societe-active`, company store or topbar selector remains; person-lease receipt sends no company, shows no company chip and prints the landlord issue place after "Fait à"; company-lease receipt uses the lease company.
- [ ] Note de frais behaves per 0/1/N companies as decided; History reload reopens the right company; switching companies never mixes draft lines; landlord issue place persists through the LMNP person form and contract types regenerate cleanly.
- [ ] New tests written first (red watched) cover backend null-company/`lieu` and the frontend selection/draft/history paths; all gates below green with ≥80% changed-line coverage and one full E2E run.

## Commands
- `cd backend && ./mvnw -B verify` · `scripts/diff-coverage.sh 7aee25f backend`
- `cd frontend && npm run gen:api && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 7aee25f frontend`
- `make e2e-up` once, then `make e2e` (rebuild changed services; keep the stack up — `make e2e-down` only after acceptance)

## Evidence
Append one line per event; never rewrite a previous line.

## Builder evidence (resumed session)
- Resumed after the predecessor hit its turn limit with uncommitted work; no red run from that session is claimed here, only the runs below.
- Files: 57 in commit cc327bd (openapi, V13 migration, backend null-company/issue-place, RentReceiptMapper split, frontend page-local company, E2E specs, README); `.handoff/` excluded.
- Red→green unit: frontend coverage run 1 was 56 failed / 849 (useExpenseStatementPage 26, GenerateExpenseStatementPage 23, SettingsPage 2, PersonnesSection 2, HistoryPage 1, useDraftBlock 1, LeaseReceiptModal 1) → 849/849 after query-mock `isSuccess`, scoped draft keys, History draft scope and AI scoped-lines fixes.
- Red→green E2E: run 1 25/26, 01-rent-receipt failed on `/Fait à\s*Paris/` (bold runs extracted after plain text) → `/Fait à[\s\S]*?Paris/`; run 2 26/26.
- PASS `cd backend && ./mvnw -B verify`: 515 tests, 0 failures, 0 errors, 1 skipped, BUILD SUCCESS.
- PASS `scripts/diff-coverage.sh 7aee25f backend`: 100%, 54 changed lines, 0 missing.
- PASS `cd frontend && npm run test:coverage`: 67 files, 849 tests, 0 failed. PASS `npm run lint`. PASS `npm run format:check` (after prettier on 9 predecessor files). PASS `npm run build`.
- PASS `scripts/diff-coverage.sh 7aee25f frontend`: 98%, 102 changed lines, 2 missing (statementDraft.ts migration lines 191,217).
- PASS `make e2e-up`; PASS `make e2e` exit 0: 6 specs, 26 tests, 26 passing, 0 failing, no retries. Stack left running, no `make e2e-down`.
- PASS `git diff --check`.
- Contract: `openapi/openapi.yaml` — `GET /api/rent-receipts/active` companyId description, `PersonRequest.issuePlace`, `PersonDto.issuePlace`, `RentReceiptRequest.companyId` description; `npm run gen:api` left `frontend/src/api/schema.ts` hash unchanged.
- Deviations: fixed `useExpenseStatementAnalysis.ts` (scoped draft lookup, unlisted production file), `useDraftBlock.test.tsx`, comments in `pages/settings/useCompanyForm.ts`; split `RentReceiptMapper` out of `RentReceiptService` (304→271 lines).
- Commit used no `--` pathspec (git rejects already-deleted paths there); the staged set was verified as exactly the 57 task paths, no user or `.handoff` files.
- Commit: cc327bd 57 files +1075/-837
- 2026-10-28 lead: `VERDICT: PASS` (reviewer, round 1) — no blocker on the null-company path, issue-place contract, draft scoping, company lifecycle or lease-only receipts; 3 non-blocking notes (unscoped active-receipt query while no company is chosen, two vacuous modal-test assertions, missing backend red log).
- 2026-10-28 lead: `DONE — user accepted`
