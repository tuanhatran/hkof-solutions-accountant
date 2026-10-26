# <TASK-ID>

<!--
File name: `.handoff/tasks/<NN> - <TASK-ID>.md`. `<NN>` is the next unused
zero-padded two-digit number in that folder: if the last file is
`14 - AGENT-E2E-DONE-RULE.md`, the next handoff file begins with `15 - `.
-->

Status: TODO
Branch: <branch>
Base: <short sha of HEAD when the branch was created>
Size: S | M | L
Round: 0/2

## Goal

One sentence, testable. Out of scope: <what must not change>.

## Files

Context (read only): `path`, `path`, `Symbol` / `METHOD /route`
Writable: `path`, `path` (S: directories or globs when more than 6 files)
Affected tests: `path`, `path`

## Constraints

Contract: none | `openapi/openapi.yaml#/paths/...`
Money: `CalculationService` only · UI French · no `any` · builder commits once (explicit paths), nobody pushes

## Acceptance

- [ ] observable check 1
- [ ] observable check 2
- [ ] gates for the change type pass (see Commands); where required: changed-line coverage >= 80% via `scripts/diff-coverage.sh <Base>` (JaCoCo backend, Vitest frontend); production classes and component CSS < 300 lines

## Commands

Run once, at the end, only the gates the change type requires (gate table in `builder.md`):

- docs, comments only: `git diff --check`
- tests only, or component CSS only: affected tests + the side's lint/format (frontend also `npm run build`)
- backend: `cd backend && ./mvnw -B verify`
- frontend: `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- coverage: `scripts/diff-coverage.sh <Base> backend|frontend|all` (>= 80% changed lines)
- e2e (backend or frontend production code, contract, migration, Docker/E2E config): `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`

## Evidence

Append one line per event; never rewrite a previous line.

- `YYYY-MM-DD builder:` red → `<key assertion message>`
- `YYYY-MM-DD builder:` `<command>` `<real counts>` PASS|FAIL
- `YYYY-MM-DD builder:` changed-line coverage backend `<x>%` (`<n>` lines) · frontend `<x>%` (`<n>` lines) vs `<Base>`
- `YYYY-MM-DD builder:` E2E `<exit code>` `<specs>` specs `<tests>` tests PASS | `E2E: skipped, <gate table row>`
- `YYYY-MM-DD builder:` `Commit: <short-sha> <n> files +<a>/-<d>`
- `YYYY-MM-DD lead:` `VERDICT: PASS | BLOCKERS (n) | BLOCKED` (reviewer, round n)
- `YYYY-MM-DD lead:` `USER_CHANGES_REQUESTED — <user request>` (Round reset to 0)
- `YYYY-MM-DD lead:` `DONE — user accepted`

<!--
Compact handoff shared by .qoder/, .opencode/ and .github/ agents.
Target 25 lines, 6 lines maximum for size S. `/quick-dev` writes no handoff.
Gates depend on the change type (table in `builder.md`, End of task): docs-only, tests-only
and CSS-only changes skip coverage and E2E; production code, contract, migration or
Docker/E2E config run the matching coverage gates plus one full E2E run. Production classes
and component CSS stay under 300 lines (split, never shrink by deleting comments).

Status flow: TODO -> REVIEW -> USER_REVIEW -> DONE, gated by the user.
- builder commits once after its gates pass, appends `Commit:`, then ends at REVIEW (M/L)
  or USER_REVIEW (S).
- reviewer is read-only: it returns its verdict to the lead, which records the VERDICT
  line and sets USER_REVIEW (PASS) | CHANGES_REQUESTED | BLOCKED.
- The lead reports and asks the user to accept; explicit acceptance sets DONE.
- User feedback before acceptance: lead sets USER_CHANGES_REQUESTED, appends the request to
  Goal and Acceptance, resets Round to 0 and routes back to builder (a new commit).
- Reviewer blockers: CHANGES_REQUESTED (Round incremented, back to builder).
- Round 2 still blocked: BLOCKED, carrying the single decision for the user.
There is no IN_PROGRESS. A DONE task is never reopened: a later requirement gets a new
task ID.

Who writes what:
- lead: picks the next `<NN>` and writes `.handoff/tasks/<NN> - <TASK-ID>.md`;
  Status, Branch, Base, Size, Round, Goal, Files, Constraints, Acceptance, Commands;
  the reviewer's VERDICT line; USER_REVIEW after the S commit skim, DONE on explicit user
  acceptance, USER_CHANGES_REQUESTED on user feedback.
- builder: evidence lines (including `Commit:`), Status REVIEW (M/L) or USER_REVIEW (S)
  when its gates pass and the commit is made.
- reviewer: nothing in the file. It reads `Base..HEAD` (round 2: the fix commit only).

Routing by Size: S (up to 15 files) = builder only; M (up to 25) = builder then one review;
L (26 to 40, or contract, money, migration, template sandbox, LLM, security) = builder then at
most two review rounds. Above 40 files the lead asks the user to split the task. Money,
contract, migration, template, LLM or secrets in the diff forces a review whatever the size.
-->