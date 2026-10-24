# <TASK-ID>

<!--
File name: `.handoff/tasks/<NN> - <TASK-ID>.md`. `<NN>` is the next unused
zero-padded two-digit number in that folder: if the last file is
`14 - AGENT-E2E-DONE-RULE.md`, the next handoff file begins with `15 - `.
-->

Status: TODO
Branch: <branch>
Size: S | M | L
Round: 0/2

## Goal

One sentence, testable. Out of scope: <what must not change>.

## Files

Context (read only): `path`, `path`, `Symbol` / `METHOD /route`
Writable: `path`, `path`
Affected tests: `path`, `path`

## Constraints

Contract: none | `openapi/openapi.yaml#/paths/...`
Money: `CalculationService` only · UI French · no `any` · no commit or push

## Acceptance

- [ ] observable check 1
- [ ] observable check 2
- [ ] coverage gates met: backend `./mvnw -B verify` >= 90% LINE/BRANCH, frontend `npm run test:coverage` >= 90% lines/statements/functions/branches; production classes < 300 lines

## Commands

- backend: `cd backend && ./mvnw -B verify`
- frontend: `cd frontend && npm run typecheck && npm test && npm run test:coverage && npm run build`
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`

## Evidence

Append one line per event; never rewrite a previous line.

- `YYYY-MM-DD builder:` red → `<key assertion message>`
- `YYYY-MM-DD builder:` `<command>` `<real counts>` PASS|FAIL
- `YYYY-MM-DD builder:` coverage backend LINE `<x>%` BRANCH `<x>%` · frontend lines/statements/functions/branches `<x>/<x>/<x>/<x>%`
- `YYYY-MM-DD reviewer:` `VERDICT` (round n)
- `YYYY-MM-DD lead:` `USER_CHANGES_REQUESTED — <user request>` (Round reset to 0)
- `YYYY-MM-DD lead:` `DONE — user accepted`

<!--
Compact handoff shared by .qoder/, .opencode/ and .github/ agents.
Target 25 lines, 6 lines maximum for size S.
Every task keeps backend JaCoCo >= 90% LINE/BRANCH and frontend Vitest >= 90%; production
classes stay under 300 lines (split, never shrink by deleting comments).

Status flow: TODO -> REVIEW -> USER_REVIEW -> DONE, gated by the user.
- builder ends at REVIEW (M/L) or USER_REVIEW (S); reviewer ends at USER_REVIEW on PASS.
- The lead reports and asks the user to accept; explicit acceptance sets DONE.
- User feedback before acceptance: lead sets USER_CHANGES_REQUESTED, appends the request to
  Goal and Acceptance, resets Round to 0 and routes back to builder.
- Reviewer blockers: CHANGES_REQUESTED (Round incremented, back to builder).
- Round 2 still blocked: BLOCKED, carrying the single decision for the user.
There is no IN_PROGRESS. A DONE task is never reopened: a later requirement gets a new
task ID.

Who writes what:
- lead: picks the next `<NN>` and writes `.handoff/tasks/<NN> - <TASK-ID>.md`;
  Status, Branch, Size, Round, Goal, Files, Constraints, Acceptance, Commands;
  USER_REVIEW after the S diff skim, DONE on explicit user acceptance,
  USER_CHANGES_REQUESTED on user feedback.
- builder: evidence lines, Status REVIEW (M/L) or USER_REVIEW (S) when its gates pass.
- reviewer: its VERDICT line and Status USER_REVIEW (PASS) | CHANGES_REQUESTED | BLOCKED.

Routing by Size: S = builder only; M = builder then one review; L = builder then at most
two review rounds. Money, contract, migration, template, LLM or secrets in the diff forces
a review whatever the size.
-->
