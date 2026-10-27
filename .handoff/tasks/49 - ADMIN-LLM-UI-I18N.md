# 49
Status: DONE
Branch: feat/49-admin-llm-ui-i18n
Base: 52ee18c
Size: L
Round: 1/2
## Goal
Make the Admin IA page fully bilingual FR/EN with react-i18next — status labels/descriptions, connection and advanced settings, API key block, remote warning, save bar, test feedback and the `llmSchema` messages — while French stays byte-identical. Out of scope: backend LLM client/prompt content, server-supplied text (`status.message`, `testResult.message`, prompt bodies, model names), `components/llm/LlmBadge.tsx` (already translated), other pages, PDFs, contract.
## Files
Read: .handoff/tasks/{39 - I18N-FOUNDATION,47 - PEOPLE-EXPENSES-LMNP-I18N,48 - TEMPLATES-UI-I18N}.md · frontend/src/i18n/{index.ts,resources/fr.ts,resources/en.ts} · frontend/src/test/setup.ts · frontend/src/components/llm/LlmBadge.tsx · frontend/src/components/ui/{FieldGroup,States}.tsx
Write: frontend/src/pages/admin-llm/{AdminLlmPage,LlmConnectionSection,LlmAdvancedSection,LlmApiKeyField,LlmRemoteWarning,LlmSaveBar,LlmStatusCard,LlmTestFeedback,LlmToggle}.tsx · frontend/src/pages/admin-llm/{useAdminLlmPage.ts,adminLlmHelpers.ts} · frontend/src/lib/validation.ts (only `llmSchema`) · frontend/src/i18n/resources/{fr,en}.ts · frontend/src/pages/admin-llm/AdminLlmPage.test.tsx · frontend/src/lib/validation.test.ts
Affected tests: the two files above · frontend/src/components/{layout/AppShell,llm/LlmBadge}.test.tsx · frontend/src/hooks/useDraftBlock.test.tsx · frontend/src/router.test.tsx · frontend/src/pages/settings/SettingsPage.test.tsx · full frontend suite · full E2E
Symbols: AdminLlmPage/useAdminLlmPage · STATUSES (adminLlmHelpers) · LlmConnectionSection · LlmAdvancedSection · LlmStatusCard · llmSchema
## Constraints
FR byte-identical (wording incl. guillemets `« »`, typographic apostrophes, ellipses, every `data-cy`: `btn-test-llm`, `btn-test-llm-bas`, `btn-enregistrer-llm`, `btn-enregistrer-llm-bas`, `btn-refresh-models`, `select-llm-model`, `input-llm-modele`, `input-llm-url`, `input-llm-cle-api`, `checkbox-supprimer-cle`, `switch-llm-actif`, `llm-statut`, `badge-llm-statut-admin`, `alerte-llm-distante`, `resultat-test-llm`, `btn-reinitialiser-prompt`, `input-llm-prompt`) · no frozen copy: module-level `STATUSES` text/description must resolve at call time (keep className/dot constants) and `LlmStatusCard` must subscribe to `languageChanged`; follow the `LlmBadge` `expenseStatement.llm.*` precedent for EN wording · server text is displayed verbatim, never translated client-side or put in params; never log or return the API key · only `llmSchema` becomes language-aware (Zod function errors re-evaluated per parse); other schemas untouched, `employeeMessage`-style helper consistent with Task 47 · `valuesFromConfig`/`requestBodyFromValues`/provider names/Qwen defaults unchanged · `formatDate*` untouched · no `any`, no money, no backend/contract/secrets · `lib/validation.ts` is already 339 lines (pre-existing debt): do not grow it beyond the schema change and do not split it here · builder commits once, explicit paths, no push
## Acceptance
- No hardcoded French UI text remains in the 11 writable Admin IA files except provider/model names and server text; every label, help, placeholder, aria-label, toast, status, empty/loading/error, dialog and button uses `t()`.
- EN covers the whole page and language switching FR↔EN relabels it without reload, including `STATUSES` labels/descriptions and the `Admin IA` header; `llmSchema` errors follow the language in `zodResolver` and `safeParse`, FR stays byte-identical.
- The API key is never displayed, logged or interpolated into any translation; remote-server warning and key-deletion copy remain accurate in EN.
- Existing FR tests stay green; new EN tests cover status, connection/advanced labels, toasts, test feedback, remote warning, API key block, schema errors and language switching.
- Frontend diff coverage >= 80%; full E2E green.
## Commands
- cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build
- scripts/diff-coverage.sh 52ee18c frontend
- full E2E once: docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress; then down -v --remove-orphans; if Docker unavailable set BLOCKED.
## Builder evidence
- Files: 16 (11 admin-llm production files, FR/EN resources, `lib/validation.ts` + 2 test files); new `adminLlm` namespace, FR/EN parity 116/116 keys, 0 missing either side.
- RED `npx vitest run src/pages/admin-llm/AdminLlmPage.test.tsx src/lib/validation.test.ts` — 10 failed | 45 passed (8 new EN page tests, `llmSchema` EN, updated expense parity assertion). GREEN same command — 2 files, 59/59 passed.
- PASS `npx vitest run <63 codegraph affected files>` — 63 files, 763/763 passed.
- PASS `npm run test:coverage` — 63 files, 767/767; all files 97.07% stmts, 97.19% lines, 90.2% branches; admin-llm dir 96.68% stmts.
- PASS `scripts/diff-coverage.sh 52ee18c frontend` — 47 changed lines, 0 missing, 100% (12 files).
- PASS `npm run lint`, `npm run format:check`, `npm run build` — exit 0 (prettier --write on 5 task files, format-only).
- PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` — exit 0, 6/6 specs, 26/26 tests, 0 failing, 0 retries; `down -v --remove-orphans` exit 0.
- FR byte-identical: moved strings keep guillemets `« »`, typographic apostrophes, ellipses, em dashes; 17/17 `data-cy` present; server text (`status.message`, `testResult.message`, prompt bodies, model names) verbatim; API key never passed to `t()`/params (test asserts it never reaches DOM or toasts).
- `STATUSES.text/description` are lazy `i18n.t` getters with stable `className`/`dot`; `LlmStatusCard` subscribes via `useTranslation` (FR↔EN relabel proved by test). `llmSchema` Zod function errors re-evaluated per parse; other schemas untouched.
- Line counts: `validation.ts` 352 (339 at base; growth is the `llmSchema` refactor, pre-existing debt), LlmConnectionSection 268, useAdminLlmPage 237, all production files < 300.
- `git diff --check` PASS. Contract: none. Deviations: none. Commit: 8441eb4 16 files +912/-151
- 2026-10-27 lead: VERDICT: PASS (reviewer, round 1/2) — FR byte-identical incl. `« »`/apostrophes/ellipses/em dashes and 17/17 data-cy; live relabel proved FR→EN→FR; apiKey never translated/logged; llmSchema only schema changed; no blocker.
- 2026-10-27 lead: evidence correction (append-only) — `wc -l`: validation.ts 358 (339 at base, +19), LlmConnectionSection 270, not 352/268 as written above; no behavioural impact, pre-existing >300-line debt in validation.ts remains.
- 2026-10-27 lead: DONE — user accepted.
