# 68 - DATA-CY-EN-HISTORY-ADMIN-TEMPLATES

Status: TODO
Branch: feat/68-data-cy-en-history-admin-templates
Base: <set at branch creation>
Size: L
Round: 0/2

## Goal

Task 4/5 of the FR→EN `data-cy` migration: rename the history, admin-llm and templates hooks (`pages/history`, `pages/admin-llm`, `pages/templates`, plus the `dropzone-template-*` consumer in `LmnpPage.test.tsx`). Out of scope: generation (66), settings (67), `dialogue-`/`onglet-`/`groupe-` prefixes (69), UI text stays French.

## Files

Context (read only): `.handoff/data-cy-mapping.md`, `.handoff/tasks/{66,67} - *.md`
Writable (touch only lines containing a listed literal): `frontend/src/pages/history/{HistoryMonthSection,HistoryPage,HistoryPage.test,RentReceiptMonthPanel}.tsx`, `frontend/src/pages/admin-llm/{LlmAdvancedSection,LlmApiKeyField,LlmConnectionSection,LlmRemoteWarning,LlmSaveBar,LlmStatusCard,LlmTestFeedback,LlmToggle}.tsx`, `frontend/src/pages/templates/{ModelPreview,TemplateActiveModel,TemplateCompare,TemplateCompare.test,TemplateImportForm,TemplateVersionsList,TemplatesCard,TemplatesTab.test,ValidationReport,templateTypes}.ts`, `frontend/src/pages/settings/LmnpPage.test.tsx` (`dropzone-template-quittance` only), `frontend/cypress/e2e/04-admin-templates.cy.ts`, `frontend/cypress/e2e/{01-rent-receipt,05-multi-company}.cy.ts` (`historique-mois-*` lines only)
Symbols: `HistoryPage`, `HistoryMonthSection`, `LlmStatusCard`, `LlmConnectionSection`, `TemplateVersionsList`, `TemplateCompare`, `ValidationReport`
Affected tests: `HistoryPage.test.tsx`, `TemplateCompare.test.tsx`, `TemplatesTab.test.tsx`, `LmnpPage.test.tsx`; Cypress specs 01, 04, 05

## Renames (old → new)

historique→history · btn-nouvelle-note-frais→btn-new-expense-statement · btn-nouvelle-quittance→btn-new-rent-receipt · historique-mois-${group.month}→history-month-${group.month} · historique-colonne-note-${group.month}→history-column-statement-${group.month} · historique-colonne-quittance-${group.month}→history-column-rent-receipt-${group.month} · historique-colonne-${kind}-${month}→history-column-${kind}-${month} (call-site `kind` values: note→statement, quittance→rent-receipt) · historique-quittance-${version.id}→history-rent-receipt-${version.id} · btn-rouvrir-note-*→btn-reopen-statement-* · btn-telecharger-quittance-*→btn-download-rent-receipt-* · historique-adresse-*→history-address-* (segments too: `note`→statement, `inconnue`→unknown) · location→rental · alerte-llm-distante→alert-remote-llm · badge-llm-statut-admin→admin-llm-status-badge · llm-statut→llm-status · btn-enregistrer-llm-bas→btn-save-basic-llm · btn-test-llm-bas→btn-test-basic-llm · btn-reinitialiser-prompt→btn-reset-prompt · checkbox-supprimer-cle→checkbox-delete-key · input-llm-cle-api→input-llm-api-key · input-llm-modele→input-llm-model (LLM model, exception: never `template`) · switch-llm-actif→switch-active-llm · resultat-test-llm→llm-test-result · apercu-template→template-preview · apercu-template-pdf→template-pdf-preview · btn-apercu-template-actif→btn-active-template-preview · btn-activer-template→btn-activate-template · btn-televerser-template→btn-upload-template · btn-modele-defaut→btn-default-template · btn-comparer-versions→btn-compare-versions · btn-annuler-comparaison→btn-cancel-comparison · barre-comparaison→comparison-bar · comparaison-modeles→templates-comparison · comparaison-modele-droite→template-comparison-right · comparaison-modele-gauche→template-comparison-left · comparer-modele-${template.id}→compare-template-${template.id} · entetes-versions-modele→template-versions-headers · input-template-nom→input-template-name · rapport-validation-template→template-validation-report · dropzone-template-quittance→dropzone-rent-receipt-template · dropzone-template-note→dropzone-statement-template
Never rename: `input-llm-prompt`, `input-llm-url`, `select-llm-model`, `btn-refresh-models` (already EN); `dialogue-modele-defaut`, `dialogue-supprimer-template`, `dialogue-rouvrir-note` (69); `tab-*` (69).

## Constraints

Contract: none · Money: none · UI text stays French, hooks English · no `any` · no behaviour change · test-only values renamed, assertions never deleted · every file mentioning a renamed literal updated in this task · builder commits once (explicit paths), nobody pushes

## Acceptance

- [ ] `grep -rn '<old>' frontend/src frontend/cypress` for every old literal above returns nothing; new literals present in suppliers and consumers
- [ ] `input-llm-modele` became `input-llm-model` (LLM model semantics preserved)
- [ ] gates pass (Commands); changed-line coverage >= 80 %

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh <Base> frontend` · e2e: `make e2e-up` once, then `make e2e`

## Evidence

- (builder appends)
