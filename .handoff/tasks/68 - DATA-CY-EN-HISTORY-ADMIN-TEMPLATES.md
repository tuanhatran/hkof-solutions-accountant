# 68 - DATA-CY-EN-HISTORY-ADMIN-TEMPLATES

Status: DONE
Branch: feat/68-data-cy-en-history-admin-templates
Base: db0d15c
Size: L
Round: 2/2

## Goal

Task 4/5 of the FR→EN `data-cy` migration: rename the history, admin-llm and templates hooks (`pages/history`, `pages/admin-llm`, `pages/templates`, plus the `dropzone-template-*` consumer in `LmnpPage.test.tsx`). Out of scope: generation (66), settings (67), `dialogue-`/`onglet-`/`groupe-` prefixes (69), UI text stays French.

## Files

Context (read only): `.handoff/data-cy-mapping.md`, `.handoff/tasks/{66,67} - *.md`
Writable (touch only lines containing a listed literal): `frontend/src/pages/history/{HistoryAddressRow,HistoryMonthSection,HistoryPage,HistoryPage.test,RentReceiptMonthPanel}.tsx`, `frontend/src/pages/history/historyHelpers.ts` (`UNKNOWN_ADDRESS_KEY` only), `frontend/src/pages/admin-llm/{LlmAdvancedSection,LlmApiKeyField,LlmConnectionSection,LlmRemoteWarning,LlmSaveBar,LlmStatusCard,LlmTestFeedback,LlmToggle}.tsx`, `frontend/src/pages/templates/{ModelPreview,TemplateActiveModel,TemplateCompare,TemplateCompare.test,TemplateImportForm,TemplateVersionsList,TemplatesCard,TemplatesTab.test,ValidationReport,templateTypes}.ts`, `frontend/src/pages/settings/{LmnpPage,SettingsPage}.test.tsx` (`dropzone-template-quittance` only), `frontend/cypress/e2e/04-admin-templates.cy.ts`, `frontend/cypress/e2e/{01-rent-receipt,05-multi-company}.cy.ts` (`historique-mois-*` lines only)
Symbols: `HistoryPage`, `HistoryMonthSection`, `HistoryAddressRow`, `LlmStatusCard`, `LlmConnectionSection`, `TemplateVersionsList`, `TemplateCompare`, `ValidationReport`
Affected tests: `HistoryPage.test.tsx`, `TemplateCompare.test.tsx`, `TemplatesTab.test.tsx`, `LmnpPage.test.tsx`, `SettingsPage.test.tsx`; Cypress specs 01, 04, 05

## Renames (old → new)

historique→history · btn-nouvelle-note-frais→btn-new-expense-statement · btn-nouvelle-quittance→btn-new-rent-receipt · historique-mois-${group.month}→history-month-${group.month} · historique-colonne-note-${group.month}→history-column-statement-${group.month} · historique-colonne-quittance-${group.month}→history-column-rent-receipt-${group.month} · historique-colonne-${kind}-${month}→history-column-${kind}-${month} (call-site `kind` values: note→statement, quittance→rent-receipt) · historique-quittance-${version.id}→history-rent-receipt-${version.id} · btn-rouvrir-note-*→btn-reopen-statement-* · btn-telecharger-quittance-*→btn-download-rent-receipt-* · historique-adresse-*→history-address-* (segments too: `note`→statement, `inconnue`→unknown) · location→rental · alerte-llm-distante→alert-remote-llm · badge-llm-statut-admin→admin-llm-status-badge · llm-statut→llm-status · btn-enregistrer-llm-bas→btn-save-basic-llm · btn-test-llm-bas→btn-test-basic-llm · btn-reinitialiser-prompt→btn-reset-prompt · checkbox-supprimer-cle→checkbox-delete-key · input-llm-cle-api→input-llm-api-key · input-llm-modele→input-llm-model (LLM model, exception: never `template`) · switch-llm-actif→switch-active-llm · resultat-test-llm→llm-test-result · apercu-template→template-preview · apercu-template-pdf→template-pdf-preview · btn-apercu-template-actif→btn-active-template-preview · btn-activer-template→btn-activate-template · btn-televerser-template→btn-upload-template · btn-modele-defaut→btn-default-template · btn-comparer-versions→btn-compare-versions · btn-annuler-comparaison→btn-cancel-comparison · barre-comparaison→comparison-bar · comparaison-modeles→templates-comparison · comparaison-modele-droite→template-comparison-right · comparaison-modele-gauche→template-comparison-left · comparer-modele-${template.id}→compare-template-${template.id} · entetes-versions-modele→template-versions-headers · input-template-nom→input-template-name · rapport-validation-template→template-validation-report · dropzone-template-quittance→dropzone-rent-receipt-template · dropzone-template-note→dropzone-statement-template
Never rename: `input-llm-prompt`, `input-llm-url`, `select-llm-model`, `btn-refresh-models` (already EN); `dialogue-modele-defaut`, `dialogue-supprimer-template`, `dialogue-rouvrir-note` (69); `tab-historique`/`tab-*` (69); `/historique` route path in `router.tsx`/`AppNav` (not a hook); French UI/i18n text ("historique indisponible", `fr.ts`).

## Constraints

Contract: none · Money: none · UI text stays French, hooks English · no `any` · no behaviour change · test-only values renamed, assertions never deleted · every file mentioning a renamed literal updated in this task · builder commits once (explicit paths), nobody pushes

## Acceptance

- [ ] `grep -rn '<old>' frontend/src frontend/cypress` for every old literal above returns nothing; new literals present in suppliers and consumers
- [ ] `input-llm-modele` became `input-llm-model` (LLM model semantics preserved)
- [ ] gates pass (Commands); changed-line coverage >= 80 %

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh db0d15c frontend` · e2e: `make e2e-up` once, then `make e2e`

## Evidence

- 2026-10-29 builder · 28 files: 19 production suppliers in pages/{history,admin-llm,templates} (incl. templateTypes.ts), 6 unit-test consumers, cypress 01/04/05; all handoff pairs applied, `${kind}` call sites translated (rent-receipt/statement), never-renames untouched (23 hits: input-llm-{prompt,url}, select-llm-model, btn-refresh-models, dialogue-modele-defaut, dialogue-rouvrir-note, tab-historique).
- RED → GREEN: `npx vitest run` (HistoryPage, TemplateCompare, TemplatesTab, LmnpPage, SettingsPage): 25 failed / 85 passed (5 files) → 5 files / 110 tests passed; `codegraph affected` regression 12 files / 242 tests passed.
- PASS `npm run test:coverage` exit 0 — 67 files / 922 tests · PASS `npm run lint` exit 0 · PASS `npm run format:check` exit 0 (prettier --write on 4 files, whitespace/reflow only, coverage re-run after) · PASS `npm run build` exit 0 (chunk-size warning only) · PASS `git diff --check` exit 0.
- PASS `scripts/diff-coverage.sh db0d15c frontend` exit 0 — no lines with coverage information in this diff (attribute-only JSX edits, task 66/67 precedent).
- PASS `make e2e` exit 0 — stack already up from task 67 (`docker ps`), no `e2e-up` needed; 6 specs / 29 tests, 0 failing, 0 pending/skipped, no retry; stack left up.
- Acceptance: combined grep of all old FR literals over frontend/src + frontend/cypress → 0 matches; `input-llm-modele` absent, `input-llm-model` present; new literals 91 hits in suppliers and consumers.
- Deviations: (1) `aria-labelledby`/`id` pairs aligned with renamed hooks for a clean acceptance grep (task 66/67 precedent): ModelPreview `apercu-template-titre`→`template-preview-title`, TemplateCompare `comparaison-modeles-titre`→`templates-comparison-title`. (2) Test-only fixture `blob:apercu-template`→`blob:template-preview` (TemplatesTab.test). (3) cypress 05 `historique-adresse-note-*` consumers (3 lines) renamed although the file scope mentioned `historique-mois-*`; handoff rename table owns the literal and rule 5 requires updating every consumer.
- Commit: 9992f70 28 files +136/-140 · Contract: none.
- 2026-10-29 lead: `VERDICT: BLOCKERS (2)` (reviewer, round 1/2). (1) `historyHelpers.ts:19` `UNKNOWN_ADDRESS_KEY = "inconnue"` leaks `inconnue` into `history-address-*-inconnue` (test lines 801, 884): handoff requires the `inconnue`→`unknown` segment; fix the local key to `"unknown"` (known keys are `address-<id>`; grouping/sort compare against the same constant) and update the two expectations; French label "Adresse inconnue"/`fr.ts` unchanged. (2) `HistoryPage.test.tsx:679,687,829` `btn-reopen-statement-*` has no supplier: `StatementMonthPanel`'s Charger button lost its hook in `cf57731` (dangling already at base), so `user.click(null)` silently no-ops — false green. Fix test-only per reviewer: query `within(...).getAllByRole("button", { name: "Charger" })` and assert the real flow (dialog → "Charger les lignes" → `currentPath()` `/generer/note-frais`, draft month loaded; or cancel → dialog closed), keep an assertion in the address-order test (dialog message "version 1 de Janvier 2026"). No production hook re-added (per-version button would duplicate `btn-reopen-statement-*`).
- 2026-10-29 builder round 2 · fix 1: `historyHelpers.ts:19` `UNKNOWN_ADDRESS_KEY = "unknown"` (local group/sort key; French label/fr.ts untouched); expectations `history-address-2026-{01,03}-unknown`. fix 2: dangling `btn-reopen-statement-*` queries replaced by `within(column).getAllByRole("button", { name: "Charger" })`; "reloads…" asserts dialog → "Charger les lignes" → `/generer/note-frais`, draft month `2026-01`, `primedReceiptByMonth[draftScopeKey(1,"2026-01")] === 11`, 1 line `gaz`; address-order asserts dialog `/version 1 de Janvier 2026/` then cancel closed. No production hook re-added. Test file diff 9992f70..HEAD: +24/-20.
- Targeted `npx vitest run src/pages/history/HistoryPage.test.tsx src/pages/history/historyHelpers.test.ts` exit 0 — 2 files / 39 tests passed (25 + 14). No red phase for fix 2: old test passed vacuously (`user.click(null)` no-op), as lead reported.
- Affected regression (`codegraph affected`, 10 files) exit 0 — 10 files / 148 tests passed.
- PASS `npm run test:coverage` exit 0 — 67 files / 922 tests · PASS `npm run lint` exit 0 · PASS `npm run format:check` exit 0 · PASS `npm run build` exit 0 (chunk-size warning only) · PASS `git diff --check` exit 0.
- PASS `scripts/diff-coverage.sh db0d15c frontend` exit 0 — changed-line coverage 100% (1 measured line, 0 missing).
- PASS `make e2e` exit 0 — stack already up (`docker ps`, no `e2e-up`); 6 specs / 29 tests, 0 failing, 0 pending/skipped, no retry; stack left up.
- Acceptance: `-inconnue` 0 hits in frontend/src + frontend/cypress; `history-address-*-unknown` present; old FR hook regex 0 hits; `tab-historique`, `/historique`, "Adresse inconnue"/`fr.ts` untouched.
- Deviations: test-only rewrite of the two fix-2 tests (assertions replaced by stronger real-flow ones, none deleted); lead-owned `Round:` unchanged.
- Commit: dcee648 2 files +25/-21 · Contract: none.
- 2026-10-29 lead: `VERDICT: PASS` (reviewer, round 2/2) — fix commit `dcee648` reviewed in isolation: `UNKNOWN_ADDRESS_KEY = "unknown"` is local-only (grouping/last-sort/data-cy suffix, no backend key, French label untouched); the two dangling `btn-reopen-statement-*` tests now click real Charger buttons and assert the `confirmReload` flow (path, draft month 2026-01, primed receipt, `gaz` line) and the address-order dialog/cancel; no production hook re-added, no assertion weakened, never-renames intact. Task 68 ready for user acceptance.
- 2026-10-29 lead: `DONE — user accepted`; `make e2e-down` exit 0, e2e stack, containers, network and volumes removed.
