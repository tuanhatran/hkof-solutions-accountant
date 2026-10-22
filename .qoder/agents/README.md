# HomeOfficeExpenses agents

Five workflow agents drive one task at a time through a handoff file. The workflow is
adapted from the rag-support-assistant agent set to this project's contract, monetary,
template and git rules.

| Order | Agent          | Scope                                                                   |
| ----- | -------------- | ----------------------------------------------------------------------- |
| 0     | `orchestrator` | reads the handoff, routes one stage at a time, reports. Edits no file.   |
| 1     | `planner`      | scopes the task, acceptance criteria, context files, contract impact.    |
| 2     | `coder`        | implements the task with its tests, contract first.                      |
| 3     | `tester`       | runs focused then full gates, records real evidence.                     |
| 4     | `reviewer`     | read-only correctness and security review.                               |

## Handoff

One file per task: `.handoff/tasks/<TASK-ID>.md`, created from `.handoff/TEMPLATE.md`.
The tree is shared by the `.github/`, `.qoder/` and `.opencode/` agent configurations, so a
task continues unchanged when the user switches tools. `<TASK-ID>` is a short uppercase
slug such as `PREVIEW-DEBOUNCE`.

Statuses: `READY_FOR_CODE` → `READY_FOR_TEST` → `READY_FOR_REVIEW` → `DONE`, with
`CHANGES_REQUESTED`, `BLOCKED` and `USER_CHANGES_REQUESTED` as branches.

## File graph

The file graph is the local CodeGraph index in `.codegraph/` (SQLite, gitignored, not
committed), never a hand-maintained document. Stage agents use the `codegraph` CLI:
`context "<task>"`, `files`, `query`, `node`, `impact`, `affected`, and `sync` after a
change.

## Mirrors

The same five agents exist in three formats:

| Directory                  | Format                  | Role             |
| -------------------------- | ----------------------- | ---------------- |
| `.qoder/agents/*.md`       | Qoder custom agents     | source of truth  |
| `.opencode/agents/*.md`    | OpenCode subagents      | mirror           |
| `.github/agents/*.agent.md`| GitHub Copilot agents   | mirror           |

When a workflow rule changes, update the source first, then the two mirrors.

## Git rules

Each task runs on one dedicated branch, created by the orchestrator or planner after the
user agrees on a name (`git switch -c`, validated with `git check-ref-format --branch`).
Resumed tasks reuse the branch recorded in their handoff. Dirty or staged changes are
preserved: agents never reset, clean, stash or overwrite them, and report a deviation if
Git refuses a switch.

No agent commits, pushes, resets, cleans, stashes, creates worktrees, deletes branches or
creates a second branch for the same task.

## Contract

- `openapi/openapi.yaml` is the source of truth between backend and frontend.
- Frontend types are produced by `npm run gen:api` (`openapi-typescript`).
- The backend does not silently change the contract: any deviation is reported and carried
  through to the YAML and the generated types.
- Amounts are decimal strings (`"123.45"`) or integer cents, never JSON floats.

## Language

- Agent instructions, code, comments and reports are in English.
- User-facing strings only are in French (UI, documents, toasts, validation and API errors).
- Specification domain names stay French in the UI, documents and routes; code uses English
  names.

## Verification

- `cd backend && ./mvnw -B test`
- `cd frontend && npm run typecheck && npm test && npm run build`
- `make e2e` when a user flow changes and Docker is available.

Stage agents never call a real LLM in automated tests: `mock-ollama` is deterministic.
