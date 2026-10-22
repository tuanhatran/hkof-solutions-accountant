# HomeOfficeExpenses agents

Three workflow agents drive one task at a time through a handoff file. The workflow is
adapted from the rag-support-assistant agent set to this project's contract, monetary,
template and git rules.

| Order | Agent      | Scope                                                                        |
| ----- | ---------- | ---------------------------------------------------------------------------- |
| 0     | `lead`     | sizes the task, creates the branch, finds the context files, writes the compact handoff, routes, reports. Edits only `.handoff/`. |
| 1     | `builder`  | implements and tests in one loop: failing test, code, targeted tests, gates, self-fix. |
| 2     | `reviewer` | read-only, diff-scoped review. Blockers only, no style, no full-suite re-run. |

`lead` absorbs the former orchestrator and planner; `builder` absorbs the former coder and
tester. Pipeline by size: `S` = builder only, `M` = builder + one review, `L` = builder + at
most two review rounds. Money, contract, migration, template sandbox, LLM path or secrets in
the diff forces a review whatever the size.

## Handoff

One file per task: `.handoff/tasks/<TASK-ID>.md`, created from `.handoff/TEMPLATE.md`.
The tree is shared by the `.github/`, `.qoder/` and `.opencode/` agent configurations, so a
task continues unchanged when the user switches tools. `<TASK-ID>` is a short uppercase
slug such as `PREVIEW-DEBOUNCE`. Keep it compact: goal, files (context versus writable),
constraints, acceptance criteria, commands, evidence. 25 lines maximum, 6 for `S`.

Statuses: `TODO` → `REVIEW` → `DONE`, with `CHANGES_REQUESTED` as the way back to `builder`
and `BLOCKED` carrying the single decision the user must make. Evidence lines are appended,
never rewritten.

## File graph

The file graph is the local CodeGraph index in `.codegraph/` (SQLite, gitignored, not
committed), never a hand-maintained document. Stage agents use the `codegraph` CLI:
`context "<task>"`, `files`, `query`, `node`, `impact`, `affected`, and `sync` after a
change.

## Mirrors

The same three agents exist in three formats:

| Directory                  | Format                  | Role             |
| -------------------------- | ----------------------- | ---------------- |
| `.qoder/agents/*.md`       | Qoder custom agents     | source of truth  |
| `.opencode/agents/*.md`    | OpenCode subagents      | mirror           |
| `.github/agents/*.agent.md`| GitHub Copilot agents   | mirror           |

When a workflow rule changes, update the source first, then the two mirrors.

## Git rules

Each task runs on one dedicated branch, created by the lead after the user agrees on a name
(`git switch -c`, validated with `git check-ref-format --branch`).
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
