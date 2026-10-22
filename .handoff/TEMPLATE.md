# <TASK-ID>

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

## Commands

- backend: `cd backend && ./mvnw -B test`
- frontend: `cd frontend && npm run typecheck && npm test && npm run build`
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`

## Evidence

Append one line per event; never rewrite a previous line.

- `YYYY-MM-DD builder:` red → `<key assertion message>`
- `YYYY-MM-DD builder:` `<command>` `<real counts>` PASS|FAIL
- `YYYY-MM-DD reviewer:` `VERDICT` (round n)

<!--
Compact handoff shared by .qoder/, .opencode/ and .github/ agents.
Target 25 lines, 6 lines maximum for size S.

Status flow: TODO -> REVIEW -> DONE, with CHANGES_REQUESTED (back to builder),
BLOCKED (single decision for the user) as branches. There is no IN_PROGRESS and no
USER_CHANGES_REQUESTED: a requirement change reopens the goal in TODO and resets Round.

Who writes what:
- lead: Status, Branch, Size, Round, Goal, Files, Constraints, Acceptance, Commands.
- builder: evidence lines, Status REVIEW (M/L) or DONE (S, after the lead's diff skim).
- reviewer: its VERDICT line and Status DONE | CHANGES_REQUESTED | BLOCKED.

Routing by Size: S = builder only; M = builder then one review; L = builder then at most
two review rounds. Money, contract, migration, template, LLM or secrets in the diff forces
a review whatever the size.
-->
