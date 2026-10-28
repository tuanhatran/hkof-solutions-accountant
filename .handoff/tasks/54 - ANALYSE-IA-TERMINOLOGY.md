# 54 — ANALYSE-IA-TERMINOLOGY

Status: DONE
Branch: feat/54-analyse-ia-terminology
Base: 18d1c52
Size: S
Round: 0/2

## Goal
French navigation and the AI settings page title use « Analyse IA » (English "AI analysis"); no user-facing « Admin IA » / "AI Admin" remains. Out of scope: LLM behaviour, configuration, backend, contract, other copy.

## Files
Writable: `frontend/src/i18n/resources/{fr,en}.ts` (`navigation.links.aiAdmin`, `adminLlm.page.title`).
Writable tests: `frontend/src/components/layout/{AppNav,AppShell}.test.tsx` · `frontend/src/pages/admin-llm/AdminLlmPage.test.tsx` · `frontend/src/i18n/i18n.test.ts` (assert the canonical labels and their absence).
Affected tests (codegraph): the same files; full suite is the gate.

## Constraints
Contract: none. Values only, keys stable; enabled/disabled and in-progress strings unchanged; French UI + EN parity; builder commits once (explicit paths), nobody pushes.

## Acceptance
- [x] Header and mobile nav links read « Analyse IA » in FR and "AI analysis" in EN; page heading matches; no « Admin IA » / "AI Admin" user-facing value.
- [x] Tests assert the labels; full suite green; gates pass.

## Commands
- `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- `scripts/diff-coverage.sh 18d1c52 frontend`
- `make e2e-up` once, then `make e2e`; keep the stack up for acceptance, `make e2e-down` only after the user accepts. Docker unavailable → BLOCKED.

## Evidence
Files changed (6): `frontend/src/i18n/resources/{fr,en}.ts`, `frontend/src/i18n/i18n.test.ts`, `frontend/src/components/layout/{AppNav,AppShell}.test.tsx`, `frontend/src/pages/admin-llm/AdminLlmPage.test.tsx`.
PASS `make e2e` (repo root, existing stack) — exit 0; 6/6 specs, 26/26 tests, 0 failing, 0 pending, 0 skipped, 0 retries.
PASS stack left up afterwards — db, mock-ollama, backend, frontend all `running healthy`; no `e2e-down`.
PASS `scripts/diff-coverage.sh 18d1c52 frontend` — exit 0; 0 measurable changed lines, 0 missing (0/0 = vacuous). Clover only records one statement (line 1) per resource object; edited lines are string literal values; other changed files are tests.
PASS frontend gates (this task run, before E2E): 66 test files / 810 tests; lint, format:check, build green; Clover regenerated 10:45 after the copy edits.
GREEN `i18n.test.ts` + AppNav/AppShell/AdminLlmPage assertions — included in the 810 passing tests.
RED evidence per new test: not captured in the implementation turn; the continuation did not redo the implementation.
Contract: none.
Deviations: diff-coverage has no measurable production line for a copy-only change (gate exits 0 with 0/0); red-first output absent from the previous turn.
Commit: f67e645 6 files +29/-15
lead: DONE — user accepted (proceed to task 55)
