# 61 - RENT-RECEIPT-ADDITIONAL-CHARGES-EMPLOYEE-ISSUE-PLACE
Status: DONE
Branch: feat/61-rent-receipt-additional-charges-employee-issue-place
Base: f5cbed8
Size: L
Round: 2/2
## Goal
In `.card-body.rent-receipt-form-body`, add an « Ajouter une charge supplémentaire » button creating any number of label + amount lines, included in the backend total and rendered in the PDF; and add « Lieu d'émission » to the employee form, printed as `lieu` on the note de frais (CEO employee first, company fallback). Out of scope: per-employee statements, new calculation rules beyond summing the additional charges, the rent-receipt issue-place precedence (landlord then company, unchanged).
User change (pre-acceptance): each charge row must show « Libellé » + « Montant » (not a numbered label), with a Save icon; clicking Save turns the row into read-only text, swaps the icon to Edit, applies the charge to the Preview panel and re-enables « Ajouter une charge supplémentaire » (disabled while a charge is being edited). No contract or backend change.
## Files
Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/RentReceipt.java`, `domain/Person.java` (`issuePlace`), `domain/Employee.java`, `service/CalculationService.java`, `service/RentReceiptService.java`, `service/template/TemplateDataService.java`, `service/DocumentDraftService.java`, `frontend/src/pages/rent-receipt/useRentReceiptPage.ts`, `frontend/src/state/rentReceiptDraft.ts`, `frontend/src/lib/validation.ts`.
Writable backend: `openapi/openapi.yaml` (YAML first, then `npm run gen:api`); `backend/src/main/resources/db/migration/V16__rent_receipt_additional_charge.sql` (new); `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/RentReceiptAdditionalCharge.java` (new), `domain/RentReceipt.java`, `service/CalculationService.java`, `service/RentReceiptService.java`, `service/RentReceiptMapper.java`, `web/dto/RentReceiptDtos.java`, `web/dto/EmployeeDtos.java`, `web/dto/DocumentDraftDtos.java`, `service/EmployeeService.java`, `service/DocumentDraftService.java`, `service/template/TemplateDataService.java`; `backend/src/main/resources/templates/defaut/quittance.html`.
Writable frontend: `frontend/src/api/schema.ts` (generated only), `frontend/src/pages/rent-receipt/RentReceiptAmountFields.tsx`, `RentReceiptAmountFields.css`, `useRentReceiptPage.ts`, `rentReceiptRequest.ts`, `frontend/src/state/rentReceiptDraft.ts`, `frontend/src/lib/validation.ts`, `frontend/src/pages/settings/EmployeeForm.tsx`, `frontend/src/i18n/resources/fr.ts`, `en.ts`.
Affected tests: `backend/src/test/java/fr/hkof/homeofficeexpenses/service/{RentReceiptServiceTest,CalculationServiceTest,EmployeeServiceTest,TemplateDataServiceTest,DocumentDraftServiceTest,DocumentDraftPersistencePostgresTest}.java`, `service/template/BundledTemplateSignatureTest.java`, `web/ApiIntegrationTest.java`; `frontend/src/pages/rent-receipt/{GenerateRentReceiptPage,useRentReceiptPage}.test.tsx`, `frontend/src/pages/settings/EmployeeSection.test.tsx`; `frontend/cypress/e2e/01-rent-receipt.cy.ts`.
Symbols: `RentReceiptRequest` `POST /api/rent-receipts` + `/preview`; `RentReceiptDraftRequest` `PUT /api/drafts/rent-receipts`; `EmployeeRequest`/`EmployeeDto` `/api/companies/{id}/employees`; `TemplateDataService.dataStatement`; `CalculationService.totalRentReceipt`.
## Constraints
Contract: add `additionalCharges` (array of `{label: string, amount: string}` decimal pattern) to `RentReceiptRequest`, `RentReceiptDto`, `RentReceiptDraftRequest`, `RentReceiptDraftDto`; add nullable `issuePlace` to `EmployeeRequest` and `EmployeeDto`. No other schema change.
Money: `CalculationService` only; new `totalRentReceipt(rent, charges, additionalAmounts)` sums with `BigDecimal`, `HALF_UP`, scale 2, null-safe. Validate server-side with French messages: non-blank label <= 120 chars, `0 < amount`, at most 20 lines; reject negative/zero. Persist child rows in `rent_receipt_additional_charge` (label, amount NUMERIC(12,2), position, FK rent_receipt) via `RentReceipt` cascade; child rows of a receipt version are immutable (no update/delete path). Preview and generation must share the same backend total.
Template data: `charges_supplementaires` = list of `{libelle, montant}` (French formatted); default `defaut/quittance.html` renders the section at the right place. Note de frais `lieu`: first CEO employee of the company with non-blank `issue_place`, else `company.issuePlace` (reuse for `dataStatementExample`).
Frontend: no `any`; estimated total stays an explicit estimate, backend remains reference; French labels; draft store keeps `additionalCharges` in snapshot/dirty/update/load/save; `data-cy` for new controls. UI French, builder commits once (explicit paths), nobody pushes.
## Acceptance
- [ ] « Ajouter une charge supplémentaire » adds removable label + amount rows; estimated total, preview and generated PDF include them; blank label or non-positive amount shows a French validation error.
- [ ] Saving then reloading a draft restores the additional charges; generating still clears the scope draft.
- [ ] Employee form has « Lieu d'émission », persisted through the API; a generated note de frais prints that CEO place and falls back to the company place when blank.
- [ ] Contract change applied to YAML first and `schema.ts` regenerated; gates pass with real counts and changed-line coverage >= 80%; classes and CSS < 300 lines; full E2E suite green (01-rent-receipt and 05-multi-company included).
- [ ] Each charge row uses plain « Libellé » and « Montant » labels; while a row is edited, « Ajouter une charge supplémentaire » is disabled; Save validates the row (French errors), renders the label + formatted amount as text, swaps Save for Edit, updates the Preview/estimated total, and re-enables Add; Edit re-opens the inputs keeping the saved value effective until Save.
- [ ] Only saved charges reach preview, generation and the draft; generation is blocked while a charge is being edited; frontend tests and the `01-rent-receipt` E2E cover add → save → text → edit → save; no backend or OpenAPI change.
## Commands
`cd backend && ./mvnw -B verify` · `cd frontend && npm run gen:api && npm run test:coverage && npm run lint && npm run format:check && npm run build`
`scripts/diff-coverage.sh f5cbed8 all` (JaCoCo backend + Vitest Clover frontend, >= 80% each)
`make e2e-up` once, then `make e2e`: full suite, all specs/tests green, none only on a retry; keep the stack up, `make e2e-down` only after acceptance.
## Evidence
Changed: 43 files committed (39 modified, 4 new: RentReceiptAdditionalCharge, RentReceiptAdditionalChargeRepository, RentReceiptAdditionalCharges, V16 migration).
PASS cd backend && ./mvnw -B verify — 548 tests, 0 failures, 0 errors, 1 skipped; BUILD SUCCESS.
PASS cd frontend && npm run gen:api && npm run test:coverage && npm run lint && npm run format:check && npm run build — gen:api exit 0; 68 files / 906 tests; lint exit 0; Prettier all files; build exit 0.
PASS scripts/diff-coverage.sh f5cbed8 all — backend 94% (134 changed lines, 7 missing); frontend 97% (35 changed lines, 1 missing).
PASS make e2e-up — exit 0; db/backend/frontend/mock-ollama healthy, stack left running.
PASS make e2e — exit 0; 6 specs / 27 tests, 27 passing, 0 failing, no retry; 01-rent-receipt and 05-multi-company green.
RED TemplateServiceValidationTest.bundledModelsValid + TemplateActivationPostgresTest (1 failure, 1 error: unknown charges_supplementaires/libelle/montant) → GREEN after TemplateCatalog entries + section-aware TemplateValidator.
RED frontend run 1 (13 failures: 12 LeaseReceiptModal + 1 SettingsPage) → GREEN after optional additionalCharges and issuePlace: null expectations; targeted 111 tests green.
RED make e2e run 1 (reset 500, FK rent_receipt_additional_charge; 6 failing) → GREEN after child-first delete in E2eResetService.
EDGE RentReceiptAdditionalCharges 96.3%, RentReceiptAdditionalCharge 75% (7 missing lines total); classes < 300 lines (max 264), CSS 47 lines.
Deviations: TemplateCatalog.java, TemplateValidator.java, E2eResetService.java, RentReceiptAdditionalChargeRepository.java, SettingsPage.test.tsx were needed but absent from the writable/affected lists (template whitelist and E2E reset broke otherwise). React key warning comes from unchanged FieldGroup.withDescribedBy.
Contract: openapi/openapi.yaml adds AdditionalCharge (label maxLength 120, amount pattern); additionalCharges on RentReceiptRequest/RentReceiptDto/RentReceiptDraftRequest/RentReceiptDraftDto; issuePlace (string|null) on EmployeeRequest/EmployeeDto; schema.ts regenerated.
Commit: 8a223a3 43 files +1357/-59
- 2026-10-28 lead: `VERDICT: PASS` (reviewer, round 1) — money, persistence, draft round-trip, CEO-first place and contract verified; E2E counts taken from builder evidence.
- 2026-10-28 lead: cumulative diff 43 files, above the 40-file L cap reported at sizing; cohesive contract+money change, user decision pending.
- 2026-10-28 lead: `USER_CHANGES_REQUESTED — Libellé/Montant labels, per-line Save icon turning the row into text + Edit icon, saved charge applied to the preview, Add re-enabled after save and disabled during edit` (Round reset to 0).

## Builder — user changes (frontend only)
Changed: 9 files (1 new: `RentReceiptAdditionalChargeRow.tsx`); no backend/OpenAPI/migration.
RED `npx vitest run GenerateRentReceiptPage.test.tsx -t charge` — 4 failed, 32 skipped.
PASS same targeted run — 4 passed (plain labels, Add/Save flow, draft text, edit/preview).
PASS `npx vitest run GenerateRentReceiptPage.test.tsx useRentReceiptPage.test.tsx` — 69 tests, 0 failed.
PASS affected regression — 55 files / 781 tests, 0 failed.
PASS `cd frontend && npm run test:coverage` — 68 files / 907 tests, 0 failed; Clover XML written.
PASS `npm run lint` — exit 0. PASS `npm run format:check` — all files. PASS `npm run build` — exit 0.
PASS `scripts/diff-coverage.sh 8a223a3 frontend` — 87% (54 changed lines, 7 missing, >= 80%).
PASS `make e2e` (run twice, once after the CSS settled) — exit 0; 6 specs / 27 tests, 27 passing, 0 failing, no retry; stack left up, `e2e-down` not run.
Edge: total 1 300,00 -> 1 320,00 only after Save; Edit keeps the saved value in preview/total until Save; Generate blocked while editing.
Deviations: `mb-1` was added externally to `.rent-receipt-amount-fields-charge-actions` during the first E2E run (concurrent edit); kept, build and E2E re-ran on the settled file. New row component split out to keep components < 300 lines.
Contract: none.
Commit: a533390 9 files +451/-117
- 2026-10-28 lead: `VERDICT: BLOCKERS (1)` (reviewer, round 1 of the user-change loop) — `useRentReceiptPage.ts:540` stale `editingAdditionalCharge.index` after removing an earlier row: Edit Gaz → Remove Eau → Save overwrites Bois, drops it and duplicates Gaz in preview/draft/PDF; no test.

## Builder — reviewer blocker (round 1)
Changed: 3 files, no backend/OpenAPI: `useRentReceiptPage.ts`, `GenerateRentReceiptPage.test.tsx`, `useRentReceiptPage.test.tsx`.
Fix: `removeAdditionalCharge` shifts `editingAdditionalCharge` in one functional update (cancel when equal, decrement when above, new-row edit untouched); saved-row removal unchanged. Audited startEdit/save/hydration/pair/month/generation resets: no other index defect.
RED `npx vitest run GenerateRentReceiptPage.test.tsx -t "saves the edited charge in place"` — 1 failed (row 0 reloaded as Gaz 20,00, Bois lost) → GREEN 71/71 both rent-receipt files, 0 failed.
Cancel case in `useRentReceiptPage.test.tsx`: PASS before and after (the equal-index branch already cancelled); now guards it. REPRO read: UI hides Remove on the edited row, so it is unreachable from the page test.
PASS affected regression (codegraph 7 files) — 132 tests, 0 failed.
PASS `npm run test:coverage` — 68 files / 909 tests, 0 failed, exit 0. PASS `npm run lint` exit 0. PASS `npm run format:check` exit 0. PASS `npm run build` exit 0.
PASS `scripts/diff-coverage.sh a533390 frontend` — 100% (6 changed lines, 0 missing, >= 80%).
PASS `make e2e` — exit 0; 6 specs / 27 tests, 27 passing, 0 failing, no retry; stack left up, `e2e-down` not run.
Page test asserts saved rows exactly [Gaz 25,00, Bois 30,00] (no dup, no loss), estimate 1 355,00 €, preview request with both charges, draft rows.
Deviations: cancel-edit case placed in `useRentReceiptPage.test.tsx` (unreachable via the page UI, see above).
Contract: none.
Commit: 039fb1d 3 files +122/-3
- 2026-10-28 lead: `VERDICT: PASS` (reviewer, round 2) — atomic edit-index shift verified; regression test asserts [Gaz 25,00, Bois 30,00], estimate, draft and preview payload; commit `039fb1d` frontend-only.
- 2026-10-28 lead: `DONE — user accepted`
