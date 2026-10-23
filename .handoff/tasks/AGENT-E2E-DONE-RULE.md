# AGENT-E2E-DONE-RULE

Status: DONE · Branch: `fix/e2e-failures` (user reuse; deviation from one-branch-per-task) · Size: M · Round: 2/2

## Goal
Make the full Cypress E2E suite a mandatory definition-of-done gate for every task and every agent in `.qoder/`, `.opencode/` and `.github/`: no task reaches `DONE` without one green run (all tests/specs, no retry-only pass); Docker unavailable = `BLOCKED`, never done. Out of scope: application code, tests, contract, E2E specs, existing `FIX-E2E-SIGNATURE-SEED` changes.

## Files
Source (edit first): `.qoder/README.md` (`## Verification`, statuses), `.qoder/agents/lead.md` (`## Route`, `## Loop control`), `.qoder/agents/builder.md` (`## Loop`, `## Non-negotiable rules`, `## Deliverable`), `.qoder/agents/reviewer.md` (`## Blockers`)
Mirrors (same wording): `.opencode/agents/{lead,builder,reviewer}.md`, `.github/agents/{lead,builder,reviewer}.agent.md`
Affected tests: none (docs/config only) · Symbols: `make e2e`, statuses `USER_REVIEW` / `DONE` / `BLOCKED`
Do not touch: `E2eResetService.java`, `E2eResetIntegrationTest.java` (uncommitted, prior USER_REVIEW task).

## Constraints
Cross-folder edit explicitly requested by the user · English · replace contradictory "`make e2e` when a user flow changes and Docker is available" · no commit or push

## Acceptance
- [x] Same rule in all 10 files (`.qoder/` 4, `.opencode/` 3, `.github/` 3): full E2E green in one run before `DONE`, every task/size, no retry-only pass, no Docker = `BLOCKED`
- [x] Lead cannot set `DONE` without E2E evidence; builder runs the full suite every task; reviewer treats missing E2E evidence as a blocker
- [x] No contradictory E2E wording remains in the 10 files (grep: `make e2e` / "user flow changes" absent); code, tests and contract untouched

## Commands
- backend: `cd backend && ./mvnw -B test` · frontend: `cd frontend && npm run typecheck && npm test && npm run build`
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`, then `down -v --remove-orphans`

## Evidence
- 2026-10-23 lead: branch `fix/e2e-failures` reused at explicit user request; FIX-E2E-SIGNATURE-SEED stays USER_REVIEW
- 2026-10-23 builder: 10 docs edited (`.qoder/README.md`, 3 `.qoder/agents`, 3 `.opencode/agents`, 3 `.github/agents`); docs-only, no test written, no app code/tests/contract touched
- 2026-10-23 builder: `cd backend && ./mvnw -B test` — Tests run: 125, Failures: 0, Errors: 0, Skipped: 2, BUILD SUCCESS, exit 0 — PASS
- 2026-10-23 builder: `cd frontend && npm run typecheck && npm test && npm run build` — typecheck clean, 12/12 files, 69/69 tests, build OK, exit 0 — PASS
- 2026-10-23 builder: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` — exit 0, 5/5 specs, 21/21 tests, 0 failing, no retry — PASS
- 2026-10-23 builder: same compose command with `down -v --remove-orphans` — exit 0, 0 leftover containers — PASS
- 2026-10-23 builder: `codegraph sync` — already up to date; status REVIEW (M), E2E gate met by this task's own run
- 2026-10-23 builder: residual `make e2e` in `.opencode/instructions/40-verification.md` and `README.md`; `.handoff/TEMPLATE.md` status flow still user-gated only (out of scope)
- 2026-10-23 reviewer: BLOCKERS (1) round 1 — the dispatch omitted the actual 10-file diff, so consistency could not be verified; no doc defect found
- 2026-10-23 reviewer: PASS (round 2) — 10-file diff scope-clean and consistent across `.qoder`/`.opencode`/`.github`; E2E gate enforced every size; Docker unavailable and retry-only pass are blockers/BLOCKED; evidence satisfies the rule
- 2026-10-23 lead: USER_REVIEW — awaiting user acceptance
- 2026-10-23 lead: DONE — user accepted
