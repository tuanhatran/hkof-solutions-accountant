# AGENT-EFFICIENCY-RULES

Status: DONE
Branch: feat/31-agent-efficiency-rules
Size: M
Round: 1/2

## Goal

Add a role-adapted "Efficiency" section (plan first, batch independent tool calls in parallel, narrowest check during the loop, each full gate/suite exactly once at the end, quiet+tailed output, no dependency reinstalls unless deps changed, on the same failure twice diagnose instead of retrying variations, no out-of-scope refactor/rename/reformat/extra docs) to the lead, builder and reviewer agent definitions in `.opencode/agents/`, `.qoder/agents/` and `.github/agents/`. Out of scope: re-syncing the pre-existing mirror divergence, `.opencode/instructions/`, `.qoder/skills/`, `AGENTS.md`, any application code or tests.

## Files

Context (read only): `AGENTS.md` (Superpowers + mirror rules), the session efficiency rules quoted in this Goal.
Writable (9): `.opencode/agents/lead.md`, `.opencode/agents/builder.md`, `.opencode/agents/reviewer.md`, `.qoder/agents/lead.md`, `.qoder/agents/builder.md`, `.qoder/agents/reviewer.md`, `.github/agents/lead.agent.md`, `.github/agents/builder.agent.md`, `.github/agents/reviewer.agent.md`.
Affected tests: none — markdown agent config only, no production code changes.

## Constraints

Contract: none. Money: untouched. UI French: n/a. No commit or push. Preserve each file's frontmatter and existing sections verbatim; append/insert only the new Efficiency content; keep every file < 300 lines; wording adapts per role (reviewer: read-only checks batched, at most one verification command per claim; builder: gates once at the end; lead: CodeGraph explore once, parallel reads).

## Acceptance

- [x] All 9 files contain an Efficiency section consistent with the rules above and their role
- [x] `git diff` shows no other change (frontmatter, existing sections, other folders untouched)
- [x] coverage gates met: backend `./mvnw -B verify` >= 90% LINE/BRANCH, frontend `npm run test:coverage` >= 90% lines/statements/functions/branches; production classes < 300 lines (docs-only diff: gates confirm no regression)

## Commands

- backend: `cd backend && ./mvnw -B verify`
- frontend: `cd frontend && npm run test:coverage`
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`, then `down -v --remove-orphans`

## Evidence

- 2026-10-26 lead: handoff created, branch feat/31-agent-efficiency-rules, status TODO
- 2026-10-26 builder: PASS `git diff --stat` — exactly 9 agent files, 138 insertions, 0 deletions; all files < 300 lines (max 152); one `## Efficiency` per file, frontmatter/existing content untouched
- 2026-10-26 builder: PASS `cd backend && ./mvnw -B verify -q` — exit 0; JaCoCo bundle LINE 97.51%, BRANCH 92.26% (>= 90/90)
- 2026-10-26 builder: PASS `cd frontend && npm run test:coverage` — exit 0; statements 97.15%, branches 90.35%, functions 94.83%, lines 97.29% (>= 90 each); no `npm install` (no dependency change)
- 2026-10-26 builder: PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` — exit 0, 6 specs, 26/26 tests green, 0 failing, 0 retries ("All specs passed!"); teardown `down -v --remove-orphans` exit 0
- 2026-10-26 builder: no new tests (docs-only, handoff lists "Affected tests: none"); `codegraph sync` exit 0; Contract: none; no commit/push; Status -> REVIEW
- 2026-10-26 reviewer: PASS (round 1) — insertions-only across exactly the 9 files, role-appropriate, non-contradictory with mandatory gates, max file 152 lines, nothing changed outside the 9 files + handoff; APPROVED
- 2026-10-26 lead: Status -> USER_REVIEW, Round 1/2
- 2026-10-26 lead: DONE — user accepted
