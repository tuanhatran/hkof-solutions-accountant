# 48
Status: DONE
Branch: feat/48-templates-ui-i18n
Base: 39a07af
Size: L
Round: 1/2
## Goal
Make the whole templates UI bilingual FR/EN with react-i18next — labels, descriptions, dialogs, toasts, aria, empty/loading/error text — while French stays byte-identical. Out of scope: backend validator/sandbox logic, server-supplied strings (validation report errors, variable descriptions/examples), `FileDropzone`/`PdfViewer` (already translated), company/lease and LMNP settings (Tasks 46/47), Admin IA/`llmSchema`, PDFs, contract.
## Files
Read: .handoff/tasks/{39 - I18N-FOUNDATION,46 - COMPANY-LEASE-SETTINGS-I18N,47 - PEOPLE-EXPENSES-LMNP-I18N}.md · frontend/src/i18n/{index.ts,resources/fr.ts,resources/en.ts} · frontend/src/test/setup.ts · frontend/src/components/forms/FileDropzone.tsx · frontend/src/components/pdf/PdfViewer.tsx · frontend/src/pages/settings/{LmnpPage,CompanySection}.tsx
Write: frontend/src/pages/templates/{TemplatesTab,TemplatesCard,TemplateImportForm,TemplateVersionsList,ValidationReport,TemplateActiveModel,ModelPreview,ReferenceVariables}.tsx · frontend/src/pages/templates/{useTemplatesCard.ts,templateTypes.ts} · frontend/src/i18n/resources/{fr,en}.ts · frontend/src/pages/templates/TemplatesTab.test.tsx
Affected tests: the file above · frontend/src/pages/settings/{LmnpPage,SettingsPage}.test.tsx · frontend/src/components/layout/AppShell.test.tsx · frontend/src/components/llm/LlmBadge.test.tsx · frontend/src/hooks/useDraftBlock.test.tsx · frontend/src/router.test.tsx · full frontend suite · full E2E
Symbols: TemplatesCard/useTemplatesCard · TemplateImportForm · TemplateVersionsList · ValidationReport · ReferenceVariables · RENT_RECEIPT_CONFIGURATION/EXPENSE_STATEMENT_CONFIGURATION
## Constraints
FR byte-identical (wording incl. guillemets `« »`, typographic apostrophes, plurals `version(s)`, `data-cy`/`dataCy` `dialogue-supprimer-template`, `dialogue-modele-defaut`, `apercu-template`, `rapport-validation-template`) · EN natural names per the Task 43–47 precedent: "Rent receipt", "Expense statement", "Template", "Version", "Built-in", "Active" · no module-level frozen copy: `RENT_RECEIPT_CONFIGURATION`/`EXPENSE_STATEMENT_CONFIGURATION` titles/descriptions must resolve at call time (accessor or getters) and every consumer updated · server-supplied text (`report.errors`, variable list entries, `variable.description`/`example`) is displayed verbatim, never translated client-side · `formatDateTime` untouched · `FileDropzone`, `SelectedFile`, `PdfViewer`, `ConfirmDialog`, `LoadingState`/`ErrorState` need no change · no `any`, no money, no backend/contract/secrets · builder commits once, explicit paths, no push
## Acceptance
- No hardcoded French UI text remains in the 10 writable production files; every title, description, label, help, placeholder, aria-label, toast, empty/loading/error text, dialog and button uses `t()`.
- EN covers the card header, active model, versions, import/report, preview modal, variable reference and both settings embeds; switching FR↔EN relabels without reload, configuration titles/descriptions included.
- FR output is byte-identical to base for every changed string, including `« … »`, `version(s)`, `intégré`, `active` and every `data-cy`; no edit outside the templates scope.
- Existing FR tests stay green; new EN tests cover card header, versions, import/report, preview, reference variables, toasts and dialogs, plus language-aware configuration titles/descriptions.
- Frontend diff coverage >= 80%; full E2E green.
## Commands
- cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build
- scripts/diff-coverage.sh 39a07af frontend
- full E2E once: docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress; then down -v --remove-orphans; if Docker unavailable set BLOCKED.
## Builder evidence
- Files: 13 (10 templates production files, fr/en resources, TemplatesTab.test.tsx); new `templates` namespace; configuration titles/descriptions are getters resolving `i18n.t` at read time; toasts via `useTranslation`; server report/variable text untouched; `data-cy` unchanged.
- RED `npx vitest run src/pages/templates/TemplatesTab.test.tsx` — 10 failed | 20 passed (new EN tests). GREEN same command — 1 file, 30/30 passed.
- PASS `codegraph affected <12 changed paths>` — 56 test files; `npx vitest run <56>` — 56 files, 719/719 passed.
- PASS `npm run test:coverage` — 63 files, 754/754 tests, exit 0.
- PASS `npm run lint` — exit 0. PASS `npm run format:check` — exit 0 (prettier --write on 3 task files, format-only). PASS `npm run build` — exit 0, built in 1.29s.
- PASS `scripts/diff-coverage.sh 39a07af frontend` — 18 changed lines, 0 missing, 100%.
- PASS `codegraph sync` — exit 0. `git diff --check` — exit 0.
- PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` — exit 0, 6/6 specs, 26/26 tests, 0 failing, 0 retries; `down -v --remove-orphans` exit 0.
- FR byte-identical: all moved strings match base (guillemets `« »`, typographic apostrophes, `intégré`, `active`, `version(s)`); `formatDateTime` untouched; no French literal remains in the 10 production files; `downloadFileName`/default file names unchanged.
- Line counts: TemplatesCard 153, ReferenceVariables 171, useTemplatesCard 209, all templates production files < 300.
- Contract: none. Deviations: none.
- Commit: 52ee18c 13 files +709/-104

- 2026-10-27 lead: VERDICT: PASS (reviewer, round 1/2) — 58/59 FR strings byte-identical (the 59th is the JSX `importé le{" "}{date}` split), getters re-read on languageChanged via TemplatesCard subscription (proved by FR↔EN test), 10 EN tests fail on base, no server string translated; no blocker.
- 2026-10-27 lead: DONE — user accepted.
