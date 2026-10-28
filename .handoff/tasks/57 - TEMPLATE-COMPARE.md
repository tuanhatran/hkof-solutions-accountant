# 57 — TEMPLATE-COMPARE

Status: DONE
Branch: feat/57-template-compare
Base: b848fc7
Size: L
Round: 2/2

## Goal
Compare two versions of the same template side by side: per-row checkboxes (max 2) and a selection bar in the versions list open a full-screen read-only dialog with the two existing PDF previews (`POST /api/templates/{id}/preview`) and their metadata, with correct object-URL lifecycle. No activation/import/delete from the dialog, no contract or backend change.

## Files
Context (read only): `frontend/src/pages/templates/{ModelPreview.tsx,ModelPreview.css,templateTypes.ts}` · `frontend/src/components/pdf/PdfViewer.tsx` (props `url/dataCy/className`) · `frontend/src/api/endpoints.ts` (`templates.preview` 315-316) · `frontend/src/pages/templates/TemplatesTab.test.tsx` (mock harness, PdfViewer mocked `() => null`)
Writable: `frontend/src/pages/templates/{TemplateCompare.tsx,TemplateCompare.css}` (new) · `frontend/src/pages/templates/{TemplateVersionsList.tsx,TemplateVersionsList.css,useTemplatesCard.ts,TemplatesCard.tsx}` · `frontend/src/i18n/resources/{fr,en}.ts`
Writable tests: `frontend/src/pages/templates/TemplateCompare.test.tsx` (new) · `frontend/src/pages/templates/TemplatesTab.test.tsx` · `frontend/src/i18n/i18n.test.ts`
Affected tests: `TemplatesTab`, `LmnpPage`, `SettingsPage`, `router`, `AppShell`, `useDraftBlock`, `LlmBadge` (codegraph); full suite is the gate.

## Constraints
Contract: none; read-only previews, no new API call beyond two existing `templates.preview` fetches. Keep every existing `data-cy` and every version-list action.
Controller (`useTemplatesCard`): `compareSelection: number[]` (ids, max 2 — a third unchecked box is disabled; checked boxes stay toggleable), `toggleCompareSelection(template)`, `compare: { left: {template,url}; right: {template,url} } | null`, `compareInProgress`, `openCompare()` (exactly 2 selected, fetch both previews in parallel, toast on error, keep selection), `closeCompare()`; revoke both object URLs on close/replace/unmount.
List: prepend a `1.5rem` checkbox track to the **identical** header and row grid (`[1.5rem_minmax(0,1fr)_4.5rem_8rem_21rem]`); header cell `aria-hidden`; checkbox `aria-label` = "Comparer {{name}} v{{version}}" and `data-cy={`comparer-modele-${id}`}`; selection bar above the list when ≥1 selected — count (plural), `btn-comparer-versions` disabled below 2/while loading, `btn-annuler-comparaison`, `data-cy="barre-comparaison"`.
Dialog (`TemplateCompare`): portal like `ModelPreview`, Escape + backdrop close, `role="dialog" aria-modal="true" aria-labelledby`, `data-cy="comparaison-modeles"`; title/subtitle + close `aria-label`; two panels `grid gap-4 lg:grid-cols-2` (stacked below `lg`), each header name + version badge + active/built-in badges + `formatDate(createdAt)`, body `PdfViewer` `dataCy="comparaison-modele-gauche|droite"`, `className="min-h-0"`; loading state while `compareInProgress`.
i18n (FR values, EN mirrored, no existing key changes): `templates.compare.{title,subtitle,select,selection_one,selection_other,action,clear,closeAria,loading}` — "Comparer les versions", "Aperçu côte à côte de deux versions du modèle.", "Comparer {{name}} v{{version}}", "{{count}} version sélectionnée", "{{count}} versions sélectionnées", "Comparer", "Annuler", "Fermer la comparaison", "Préparation des aperçus…".

## Acceptance
- [x] Two versions selectable (max 2) and compared side by side with metadata; dialog closes by Escape, backdrop and close button; URLs revoked on close; no other list behavior changes.
- [x] Button disabled below 2 and during fetch; error shows a French toast and keeps the selection; stacked panels below `lg`, no overflow at 375px.
- [x] New tests written first (watched red) cover controller lifecycle, dialog and list selection; i18n parity; full suite, coverage ≥80%, one full E2E run green.

## Evidence
Changed: `pages/templates/{TemplateCompare.tsx,TemplateCompare.css,TemplateCompare.test.tsx,TemplateVersionsList.tsx,TemplateVersionsList.css,TemplatesCard.tsx,TemplatesTab.test.tsx,useTemplatesCard.ts}` · `i18n/i18n.test.ts` · `i18n/resources/{fr,en}.ts` (11 files).
PASS `cd frontend && npm run test:coverage` — 69 files / 856 tests; all files 96.88% stmts, 89.45% branches, 94.94% funcs, 96.97% lines.
PASS `cd frontend && npm run lint` (exit 0), `npm run format:check` (all files), `npm run build` (exit 0).
PASS `scripts/diff-coverage.sh b848fc7 frontend` — 92% changed lines (52/56); controller 90.2%, dialog/list 100%.
Red then green: first run 12 failed / 45 passed (3 files); loading-close test 1 failed / 8 passed; final 9 compare + 32 tab + 17 i18n tests green.
PASS `codegraph affected` regression — 28 files / 509 tests.
PASS E2E `make e2e-up` exit 0, then `make e2e` exit 0 — 6 specs / 26 tests / 26 passed, no retries (stack left up).
Deviations: added `clearCompareSelection()` for the cancel button and a request-token guard so closing during the preview fetch discards the late result.
Contract impact: none (no openapi, backend or migration change).
Commit: 6225518 11 files +903/-5
lead: VERDICT: BLOCKERS (1) round 1 — request token not bumped on unmount, so a preview resolving after the card unmounts creates two unreachable object URLs (`useTemplatesCard.ts:227-245`, cleanup at 57-64 cannot revoke them); also prune `compareSelection` ids of deleted versions (stale count/cap). Fix in a new commit.

### Fix round 1 (commit 39a585f)
Changed: `pages/templates/{useTemplatesCard.ts,TemplateCompare.test.tsx}` (2 files); test harness gained a `rerenderTab` helper.
Red then green: both new tests failed in the first run (2 failed / 9 passed) — unmount-while-pending `createObjectURL` called 2 times; stale selection bar showed "2 versions sélectionnées" instead of "1 version sélectionnée"; after the fix 11/11 green.
Fix: cleanup-only effect bumps `compareRequest.current` on unmount (late result discarded before any object URL); effect prunes `compareSelection` against `templates.data`; `openCompare` gates on the resolved selection length.
PASS `cd frontend && npx vitest run <6 affected>` — 6 files / 93 tests.
PASS `cd frontend && npm run test:coverage` — 69 files / 858 tests; all files 96.86% stmts, 89.4% branches, 94.97% funcs, 96.94% lines.
PASS `cd frontend && npm run lint` (exit 0), `npm run format:check` (all files), `npm run build` (exit 0); first format:check was red on `useTemplatesCard.ts`, fixed with `prettier --write`, coverage re-run green after it.
PASS `scripts/diff-coverage.sh b848fc7 frontend` — 92% changed lines (64 lines, 5 missing); `useTemplatesCard.ts` 89.8%, dialog/list 100%.
PASS E2E `make e2e` exit 0 on the running e2e stack — 6 specs / 26 tests / 26 passed, no retries (stack left up).
Deviations: none beyond the two fixes. Contract impact: none.
Commit: 39a585f 2 files +74/-4
lead: VERDICT: PASS (reviewer, round 2) — both round-1 blockers closed: token bumped on unmount before URL creation/no state after unmount; prune effect keeps the same reference when clean and frees the cap; new tests discriminated on the previous commit.
lead: DONE — user accepted

## Commands
- `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- `scripts/diff-coverage.sh b848fc7 frontend`
- `make e2e-up` once, then `make e2e` (keep the stack up; `make e2e-down` only after acceptance)
