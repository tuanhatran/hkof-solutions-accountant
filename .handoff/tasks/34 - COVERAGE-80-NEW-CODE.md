# COVERAGE-80-NEW-CODE

Status: DONE
Branch: feat/34-coverage-80-new-code
Base: e479a8f
Size: M
Round: 1/2

## Goal

Replace the global 90% JaCoCo/Vitest acceptance with >=80% changed-line coverage via `scripts/diff-coverage.sh <Base> [backend|frontend|all]`, wired into CI and stated in AGENTS.md + every `.opencode`/`.qoder`/`.github` agent doc. Out of scope: app behavior, contract, migrations, money, historical `docs/`/`.handoff` specs.

## Files

Writable: `backend/pom.xml`, `frontend/vitest.config.ts`, `scripts/diff-coverage.sh` (new, +x), `.github/workflows/ci.yml`, `AGENTS.md`, `.opencode/agents/{builder,quick-dev,reviewer}.md`, `.opencode/instructions/{20-backend,40-verification}.md`, `.opencode/commands/verify.md`, `.qoder/agents/{builder,quick-dev,reviewer}.md`, `.qoder/README.md`, `.github/agents/{builder,quick-dev,reviewer}.agent.md`, `.github/copilot-instructions.md`
Context: `backend/pom.xml` jacoco `report`/`check`, `frontend/vitest.config.ts` `coverage`, `.github/workflows/ci.yml`, `.opencode/agents/builder.md` gate table; `.opencode` is the source of truth, mirror the same edits to `.qoder`/`.github`.
Affected tests: none (no app code); validate with the full backend and frontend suites.

## Constraints & Acceptance

Contract: none · Money untouched · builder commits once (explicit paths), nobody pushes · `diff-cover==10.6.0` (CI pip, local `uvx --from diff-cover==10.6.0 diff-cover`) · keep `backend/target/site/jacoco/jacoco.xml` (remove only the global 0.90 `check`, keep `report`) and `frontend/coverage/clover.xml` (drop 90 thresholds, emit Clover) · UI French · no `any`.
- [ ] Script cds to repo root, supports `backend|frontend|all`, defaults 80% (`DIFF_COVER_MIN`), uses `--src-roots backend/src/main/java` for JaCoCo, `--include-untracked`, and both `--compare-branch` and `--fail-under`; exits 1 below 80%, 0 at/above.
- [ ] CI backend/frontend jobs use `fetch-depth: 0`, install `diff-cover==10.6.0`, pass PR base SHA (push: `before`, fallback `main`), and run the matching gate after the report step.
- [ ] No 90% global-coverage acceptance remains in AGENTS.md, `.opencode`, `.qoder`, `.github`; every gate table, coverage section, command and reviewer blocker states 80% changed-line with the script.
- [ ] Tests: none added (config/docs); run both suites plus the new gate. Smoke `scripts/diff-coverage.sh 7a9297d all` must show real task-33 changed-line percentages (report only, not a gate).

## Commands

`git diff --check` · `cd backend && ./mvnw -B verify` · `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh e479a8f all` · E2E skipped: no runtime, Docker, Cypress or contract change.

## Evidence — append one line per event; never rewrite a previous line.

- Files: backend/pom.xml (JaCoCo `check` removed, `prepare-agent`+`report` kept), frontend/vitest.config.ts (`reporter: ["text","html","clover"]`, thresholds removed), scripts/diff-coverage.sh (new, mode 100755), .github/workflows/ci.yml, AGENTS.md, .opencode/{agents/builder,quick-dev,reviewer; instructions/20-backend,40-verification; commands/verify}.md, .qoder/{README; agents/builder,quick-dev,reviewer}.md, .github/{copilot-instructions; agents/builder,quick-dev,reviewer.agent}.md — 19 files.
- PASS `git diff --check` (clean).
- PASS `cd backend && ./mvnw -B verify`: Tests run: 497, Failures: 0, Errors: 0, Skipped: 1; BUILD SUCCESS; JaCoCo report analyzed 128 classes; no global check executed.
- PASS `cd frontend && npm run test:coverage`: 59 test files / 587 tests passed; frontend/coverage/clover.xml emitted; no threshold failure possible (thresholds removed).
- PASS `npm run lint` (0 errors) · PASS `npm run format:check` ("All matched files use Prettier code style!") · PASS `npm run build` ("✓ built in 1.21s").
- PASS `scripts/diff-coverage.sh e479a8f all`: exit 0; both sides report "No lines with coverage information in this diff" — this task changes only config/docs lines, so there are no measurable changed lines; changed-line % is N/A for this diff by construction.
- PASS smoke (report-only, not this task's gate) `DIFF_COVER_MIN=0 scripts/diff-coverage.sh 7a9297d all`: exit 0; frontend 100% (27 lines, 0 missing: queries.ts, LeaseReceiptHistory.tsx, LeaseSection.tsx from task 33); backend "No lines with coverage information" — verified `git diff --name-only 7a9297d e479a8f -- backend/src/main/java` is empty (task 33 touched no backend production code).
- PASS negative probe `DIFF_COVER_MIN=101 scripts/diff-coverage.sh 7a9297d frontend`: exit 1 with 100% coverage report — proves fail-under enforcement.
- Grep of AGENTS.md/.opencode/.qoder/.github for `90%|0.90|>= 90|thresholds`: no matches remain; CI YAML parses (python yaml.safe_load OK); CI backend/frontend jobs have fetch-depth 0, DIFF_COVER_BASE env, pip diff-cover==10.6.0, gate step with `working-directory: .` after the report step.
- E2E: skipped, per handoff Commands (no runtime, Docker, Cypress or contract change).
- Contract impact: none. Deviations: none.
- Commit: 8b9bc9d 19 files +164/-91
- 2026-10-26 lead: VERDICT: PASS (reviewer, round 1) — script/CI/mirrors verified; task at USER_REVIEW.
- 2026-10-26 lead: DONE — user accepted
