# 66 - DATA-CY-EN-GENERATION

Status: USER_REVIEW
Branch: feat/66-data-cy-en-generation
Base: 49d33b5
Size: L
Round: 0/2

## Goal

Task 2/5 of the FR→EN `data-cy` migration: rename the generation-page hooks (`pages/rent-receipt`, `pages/expense-statement`, plus `select-mois` wherever it appears). Out of scope: settings/history/admin/templates pages (67-68), all `dialogue-`/`onglet-`/`groupe-` prefixed literals (69), item codes kept verbatim (`loyer`, `gaz`, `electricite`, `telephone`, `internet_pro`), UI text stays French.

## Files

Context (read only): `.handoff/data-cy-mapping.md` (rules + order), `.handoff/tasks/49 - DATA-CY-EN-SHARED.md` (pattern), `product_prompt.md` (§ CROSS-CUTTING FRONTEND REQUIREMENTS — no edit here, task 69 syncs it)
Writable (touch only lines containing a listed literal): `frontend/src/pages/rent-receipt/**`, `frontend/src/pages/expense-statement/**` (all files incl. tests), `frontend/src/components/ui/MonthField.test.tsx` (`select-mois` fixture only), `frontend/cypress/e2e/{01-rent-receipt,02-expense-statement,03-statement-finalization,04-admin-templates}.cy.ts`, `frontend/cypress/support/{e2e,helpers}.ts`
Symbols: `GenerateRentReceiptPage`, `RentReceiptForm`, `RentReceiptPreviewPane`, `ExpenseStatementHeader`, `ExpenseLinesTable`, `ExpenseGenerationFooter`, `MonthField`
Affected tests: `GenerateRentReceiptPage.test.tsx`, `GenerateExpenseStatementPage.test.tsx`, `MonthField.test.tsx`; Cypress specs 01-04 + support

## Renames (old → new)

select-mois→select-month · btn-generer-quittance→btn-generate-rent-receipt · btn-telecharger-quittance→btn-download-rent-receipt · btn-enregistrer-brouillon→btn-save-draft · brouillon-statut→draft-status · volet-saisie→entry-pane · volet-apercu→preview-pane · select-bailleur→select-landlord · select-locataire→select-tenant · detail-bail→lease-detail · alerte-bail-manquant→alert-missing-lease · alerte-signature-bailleur→alert-landlord-signature · alerte-signatures-erreur→alert-signatures-error · btn-ajouter-charge-supplementaire→btn-add-extra-charge · btn-annuler-charge-supplementaire→btn-cancel-extra-charge · btn-enregistrer-charge-supplementaire→btn-save-extra-charge · btn-modifier-charge-supplementaire-${index}→btn-edit-extra-charge-${index} · btn-retirer-charge-supplementaire-${index}→btn-remove-extra-charge-${index} · charge-supplementaire-${index}→extra-charge-${index} · input-charge-supplementaire-libelle→input-extra-charge-label · input-charge-supplementaire-montant→input-extra-charge-amount · select-template-apercu→select-preview-template · societe-quittance→company-rent-receipt (negative assertions only, keep polarity) · dropzone-fichier→dropzone-file · input-montant-ttc→input-amount-incl-vat · select-type-frais→select-expense-type · btn-ajouter-frais→btn-add-expense · liste-frais→expense-list · ligne-frais-${line.itemCode}→expense-line-${line.itemCode} · btn-modifier-${line.itemCode}→btn-edit-${line.itemCode} · btn-supprimer-${line.itemCode}→btn-delete-${line.itemCode} · btn-voir-justificatif-${line.itemCode}→btn-view-supporting-document-${line.itemCode} · total-retenu→retained-total · btn-generer-note→btn-generate-statement · btn-telecharger-note→btn-download-statement · btn-telecharger-note-complete→btn-download-full-statement · alerte-pdg-manquant→alert-missing-ceo · alerte-signature-manquante→alert-missing-signature · alerte-quittance-manquante→alert-missing-rent-receipt · alerte-aucun-bail→alert-no-lease · btn-modifier-quittance→btn-edit-rent-receipt · select-quittance→select-rent-receipt · lien-configurer-societe→link-configure-company · bail-note-frais→lease-expense-statement · select-bail-note-frais→select-lease-expense-statement · select-societe-note-frais→select-company-expense-statement · societe-note-frais→company-expense-statement · prompt-bail-note-frais→lease-expense-statement-prompt · toggle-apercu-complet→toggle-full-preview · input-periode-debut→input-period-start (cypress-only `not.exist`) · input-periode-fin→input-period-end (cypress-only `not.exist`)
Never rename: `select-signature`, `input-prorata` (already EN), `dialogue-regeneration-note|quittance`, `dialogue-suppression-frais` (69), `historique-mois-*`, `tab-historique` (68-69).

## Constraints

Contract: none · Money: none · UI text stays French, hooks English · no `any` · no behaviour change · item codes in dynamic hooks stay verbatim · test-only values renamed, assertions never deleted or weakened · every file mentioning a renamed literal updated in this task · builder commits once (explicit paths), nobody pushes · never touch `dialogue-`/`onglet-`/`groupe-` literals (69)

## Acceptance

- [ ] `grep -rn '<old>' frontend/src frontend/cypress` for every old literal above returns nothing; new literals present in suppliers and consumers
- [ ] item-code segments (`-loyer`, `-gaz`, `-electricite`, `-telephone`, `-internet_pro`) untouched
- [ ] gates pass (Commands); changed-line coverage >= 80 %

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 49d33b5 frontend` · e2e: `make e2e-up` once (stack may already be up from task 49), then `make e2e`

## Evidence

- 2026-10-29 builder · 31 files: 22 production suppliers in pages/{rent-receipt,expense-statement}, MonthField.test.tsx (select-mois fixture), 2 unit-test consumers, cypress e2e/{01,02,03,04,05}.cy.ts + support/{e2e,helpers}.ts; 49 renames; item codes and ${line.itemCode}/${index} verbatim; dialogue-/onglet-/groupe-/historique-/tab-historique/select-signature/input-prorata untouched.
- RED → GREEN: `npx vitest run` (GenerateRentReceiptPage, GenerateExpenseStatementPage, MonthField): 17 failed / 58 passed → after renames 3 files / 75 tests passed.
- PASS `npm run test:coverage` exit 0 — 67 files / 922 tests (post-format re-run of the 2 reformatted test files: 70 passed).
- PASS `npm run lint` exit 0 · PASS `npm run format:check` exit 0 (prettier --write on 6 files, whitespace only) · PASS `npm run build` exit 0 (chunk-size warning only) · PASS `git diff --check` exit 0.
- PASS `scripts/diff-coverage.sh 49d33b5 frontend` exit 0 — attribute-only JSX edits, no executable changed lines (same case as task 49).
- PASS `make e2e-up` exit 0 (stack healthy), then `make e2e` exit 0 — 6 specs / 29 tests, 0 failing, no retry; stack left up.
- Acceptance: boundary-aware grep of old literals over frontend/src frontend/cypress → no match; 51 new-literal checks present; expense-line-(loyer|gaz|electricite|telephone) verbatim (15 occurrences); never-rename hooks still present.
- Deviations: (1) cypress/e2e/05-multi-company.cy.ts (6 lines) renamed although not in the writable list — it consumes select-societe-note-frais/select-type-frais/total-retenu/btn-generer-note, dictionary rule 5 (every mentioning file updated) and E2E green require it. (2) Two unreferenced `id=` attributes in ExpenseStatementHeader.tsx (select-societe-note-frais, select-bail-note-frais) aligned with their renamed data-cy counterparts so the acceptance grep is clean.
- Commit: 5c802ed 31 files +252/-248 · Contract: none.
- 2026-10-29 lead: `VERDICT: PASS` (reviewer, round 1/2) — rename set complete and 1:1 with handoff pairs, polarity preserved, deviations justified (05 spec per rule 5; unreferenced `id=` alignment). Status USER_REVIEW; series continues to 67 per user instruction.
