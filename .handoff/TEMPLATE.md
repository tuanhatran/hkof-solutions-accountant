# Agent Handoff: <TASK-ID>

Status: READY_FOR_CODE

## Status Flow

`READY_FOR_CODE` to `READY_FOR_TEST` to `READY_FOR_REVIEW` to `DONE`.
Use `CHANGES_REQUESTED` for test or review findings, `BLOCKED` for an unresolved decision,
and `USER_CHANGES_REQUESTED` when the user changes requirements during final review; route
that status back to `planner`.

## Current Task

- Task:
- Branch: (new task: name agreed with the user and created by the orchestrator or planner;
  existing task: reuse the recorded branch)
- Complexity: S | M | L
- Context files:
- File graph: CodeGraph index in `.codegraph/` (`codegraph sync` after code changes)
- Acceptance criteria:
- Contract impact: none | paths and fields in `openapi/openapi.yaml`
- Test commands: `cd backend && ./mvnw -B test`;
  `cd frontend && npm run typecheck && npm test && npm run build`
- Fix rounds: 0 / 3
- Previous stage: Planning
- Changed files:
- Test results:
- Notes:

## Handoff

@coder: implement the task above, reading only the listed context files.
