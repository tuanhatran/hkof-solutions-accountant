# 69 - DATA-CY-EN-PREFIXES-PROMPT

Status: TODO
Branch: feat/69-data-cy-en-prefixes-prompt
Base: <set at branch creation>
Size: L
Round: 0/2

## Goal

Task 5/5 of the FR→EN `data-cy` migration: rename every remaining component-owned prefix literal (`dialogue-`→`dialog-`, `onglet-`→`tab-`, `groupe-`→`group-`, nav `tab-*`) and sync the `product_prompt.md` `data-cy` bullet to the final English names. `toast-` stays (rule 2). Out of scope: nothing — after this task no FR hook remains anywhere.

## Files

Context (read only): `.handoff/data-cy-mapping.md`, `.handoff/tasks/{66,67,68} - *.md`
Writable (touch only lines containing a listed literal): `frontend/src/components/ui/{ConfirmDialog,ConfirmDialog.test,Dialog.test,FormModal,ViewTabs.test}.tsx`, `frontend/src/components/layout/{AppNav,AppNav.test,AppShell,AppShell.test}.tsx`, `frontend/src/components/settings/{LeaseSection,PersonnesSection,PersonSignatureSection,LeaseReceiptModal}.tsx`, `frontend/src/pages/settings/{CompanySection,LmnpPage,CompanyLeaseExpensesModal,CompanyLeaseExpensesModal.test,CompanyIdentityModal.test,ExpenseItemForm,ExpenseItemForm.test,ExpenseItemsManager,ExpenseItemsManager.test,EmployeeSection,EmployeeSection.test,CompanyLeaseTab.test,SettingsPage.test}.tsx`, `frontend/src/pages/expense-statement/GenerateExpenseStatementPage.tsx`, `frontend/src/pages/rent-receipt/GenerateRentReceiptPage.test.tsx`, `frontend/src/pages/history/HistoryReloadDialog.tsx`, `frontend/src/pages/templates/TemplatesCard.tsx`, `frontend/cypress/e2e/{00,01,02,03,04,05}*.cy.ts`, `product_prompt.md` (§ CROSS-CUTTING FRONTEND REQUIREMENTS, `data-cy` bullet only)
Symbols: `FormModal`, `ConfirmDialog`, `Dialog`, `ViewTabs`, `AppNav`, `AppShell`, `HistoryReloadDialog`
Affected tests: listed above; Cypress specs 00-05; `AppNav.test.tsx`

## Renames (old → new)

dialogue-${formDataCy}→dialog-${formDataCy} (FormModal template) · dialogue-confirmer→dialog-confirm · dialogue-extra→dialog-extra · dialogue-quitter→dialog-leave · dialogue-frais→dialog-expense (Dialog.test fixture) · dialogue-supprimer-poste→dialog-delete-item (Dialog.test fixture) · dialogue-frais-bail-societe→dialog-company-lease-expenses · dialogue-modele-defaut→dialog-default-template · dialogue-quittance-bail→dialog-lease-rent-receipt · dialogue-regeneration-note→dialog-statement-regeneration · dialogue-regeneration-quittance→dialog-rent-receipt-regeneration · dialogue-suppression-frais→dialog-expense-deletion · dialogue-supprimer-bail→dialog-delete-lease · dialogue-supprimer-personne→dialog-delete-person · dialogue-supprimer-signature-personne→dialog-delete-person-signature · dialogue-supprimer-salarie→dialog-delete-employee · dialogue-supprimer-societe→dialog-delete-company · dialogue-supprimer-template→dialog-delete-template · dialogue-rouvrir-note→dialog-reopen-statement · dialogue-formulaire-personne→dialog-person-form · dialogue-formulaire-poste→dialog-item-form · dialogue-formulaire-salarie→dialog-employee-form · dialogue-formulaire-societe→dialog-company-form (after 67 these read `dialogue-person-form` etc. — same target: flip the prefix to `dialog-`) · onglet-a→tab-a · onglet-b→tab-b (test fixtures) · onglet-baux→tab-leases · onglet-personnes→tab-persons · onglet-lmnp-templates→tab-lmnp-templates · onglet-entreprise-identification→tab-company-identification · onglet-entreprise-bail-frais→tab-company-lease-expenses · onglet-entreprise-salaries→tab-company-employees · onglet-entreprise-templates→tab-company-templates · groupe-${group.titleKey}→group-${group.titleKey} · tab-historique→tab-history · tab-note-frais→tab-expense-statement · tab-quittance→tab-rent-receipt
`product_prompt.md` bullet pairs (drop = no such hook in code, remove the entry): tab-quittance→tab-rent-receipt · tab-note-frais→tab-expense-statement · select-mois→select-month · btn-generer-quittance→btn-generate-rent-receipt · select-type-frais→select-expense-type · dropzone-fichier→dropzone-file · input-montant-ttc→input-amount-incl-vat · input-montant-mois→DROP · btn-ajouter-frais→btn-add-expense · liste-frais→expense-list · ligne-frais-<code>→expense-line-<code> · btn-modifier-<code>→btn-edit-<code> · btn-supprimer-<code>→btn-delete-<code> · total-retenu→retained-total · btn-generer-note→btn-generate-statement · btn-telecharger-note→btn-download-statement · btn-telecharger-note-complete→btn-download-full-statement · alerte-quittance-manquante→alert-missing-rent-receipt · volet-saisie→entry-pane · volet-apercu→preview-pane · apercu-pdf→DROP · toggle-apercu-complet→toggle-full-preview · switch-llm-actif→switch-active-llm · btn-test-llm→btn-test-basic-llm · badge-llm-status→admin-llm-status-badge · dropzone-template-quittance→dropzone-rent-receipt-template · dropzone-template-note→dropzone-statement-template · btn-activer-template→btn-activate-template · rapport-validation-template→template-validation-report · btn-modele-defaut→btn-default-template. Kept unchanged in the bullet: tab-templates, tab-admin, input-prorata, select-template, preview-updated, analysis-status, btn-cancel-analysis, badge-ai-detected, btn-confirm-amount, input-llm-url, select-llm-model, btn-refresh-models.

## Constraints

Contract: none · Money: none · UI text stays French, hooks English · no `any` · no behaviour change · `dialogue-${formDataCy}` template change is atomic with all its consumers · test-only values renamed, assertions never deleted · builder commits once (explicit paths), nobody pushes · edit only the `data-cy` bullet of `product_prompt.md`

## Acceptance

- [ ] `grep -rn 'dialogue-\|onglet-\|groupe-\|historique\|quittance\|frais\|mois\|societe\|bail\|personne\|salarie\|poste\|justificatif\|telecharger\|generer\|ajouter\|modifier\|supprimer\|apercu\|saisie\|volet\|alerte\|aucun\|aucune\|formulaire\|liste\|ligne\|entetes\|filtre\|tri\|total-retenu\|montant-ttc\|modele' frontend/src frontend/cypress --include='*.ts' --include='*.tsx'` returns no `data-cy` FR literal (word boundaries in hook values only)
- [ ] `product_prompt.md` bullet lists only English literals; dropped entries removed; 5 task-49 entries intact
- [ ] gates pass (Commands); changed-line coverage >= 80 %

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh <Base> frontend` · e2e: `make e2e-up` once, then `make e2e` · final: `git diff --check` on `product_prompt.md`

## Evidence

- (builder appends)
