# HomeOfficeExpenses agents

Three workflow agents drive one task at a time through a handoff file. The workflow is
adapted from the rag-support-assistant agent set to this project's contract, monetary,
template and git rules.

| Order | Agent      | Scope                                                                                                                             |
| ----- | ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 0     | `lead`     | sizes the task, creates the branch, finds the context files, writes the compact handoff, routes, reports. Edits only `.handoff/`. |
| 1     | `builder`  | implements and tests in one loop: failing test, code, targeted tests, gates, self-fix.                                            |
| 2     | `reviewer` | read-only, diff-scoped review. Blockers only, no style, no full-suite re-run.                                                     |

`lead` absorbs the former orchestrator and planner; `builder` absorbs the former coder and
tester. Pipeline by size: `S` = builder only, `M` = builder + one review, `L` = builder + at
most two review rounds. Money, contract, migration, template sandbox, LLM path or secrets in
the diff forces a review whatever the size.

## Models

All three agents use DeepSeek Flash:

| Agent      | Model (OpenCode)                    | Model (Qoder)    | Role                     |
| ---------- | ----------------------------------- | ---------------- | ------------------------ |
| `lead`     | `opencode/deepseek-v4.1-flash-free` | `DeepSeek-Flash` | sizing, handoff, routing |
| `builder`  | `opencode/deepseek-v4.1-flash-free` | `DeepSeek-Flash` | implementation and tests |
| `reviewer` | `opencode/deepseek-v4.1-flash-free` | `DeepSeek-Flash` | blocker-only diff review |

- `.opencode/agents/*.md` pins `opencode/deepseek-v4.1-flash-free` in frontmatter.
- `.qoder/agents/*.md` pins Qoder's own model name, `DeepSeek-Flash`.
- `.github/agents/*.agent.md` carries no model: Copilot selects its own.

Do not copy an OpenCode provider ID into a Qoder agent; use the Qoder model name.

## Runtime settings

OpenCode settings live in `.opencode/opencode.json`; the Qoder equivalents live in
`.qoder/settings.json` and in the agent frontmatter:

| OpenCode                                        | Qoder equivalent                                                                        |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| `default_agent: lead`                           | `"agent": "lead"` in `.qoder/settings.json` (restart required)                          |
| `lead`/`builder`/`reviewer` model pin           | `model: DeepSeek-Flash` in every agent file                                             |
| `reviewer` edit/shell/execute deny              | `disallowedTools: [Write, Edit, NotebookEdit, Bash, Agent]` + `permissionMode: dontAsk` |
| `experimental.subagent_depth: 2`                | Nested dispatch works while the `Agent` tool stays enabled                              |
| `skills: [".qoder/skills"]`                     | Default discovery; no setting needed                                                    |
| Git guards in `permissions`                     | `permissions.deny` with `Bash(git ...)` rules                                           |
| `instructions: [".opencode/instructions/*.md"]` | No glob loader; the agents read these files on demand                                   |

Qoder frontmatter requires `name` and `description`; a file without them is reported as a
load error. The agent README lives at `.qoder/README.md`, not under `.qoder/agents/`, because
Qoder parses every `.md` file in that directory as an agent.

## Handoff

One file per task: `.handoff/tasks/<TASK-ID>.md`, created from `.handoff/TEMPLATE.md`.
The tree is shared by the `.github/`, `.qoder/` and `.opencode/` agent configurations, so a
task continues unchanged when the user switches tools. `<TASK-ID>` is a short uppercase
slug such as `PREVIEW-DEBOUNCE`. Keep it compact: goal, files (context versus writable),
constraints, acceptance criteria, commands, evidence. 25 lines maximum, 6 for `S`.

Statuses: `TODO` → `REVIEW` → `USER_REVIEW` → `DONE`, gated by the user and by the E2E gate.
`DONE` requires the full green E2E evidence in the handoff; without it the lead keeps the task
at `USER_REVIEW`, or sets `BLOCKED` when the suite cannot run. `builder` ends at
`REVIEW` (M/L) or `USER_REVIEW` (S); `reviewer` sets `USER_REVIEW` on `VERDICT: PASS`. The
lead reports and asks the user to accept: explicit acceptance sets `DONE`. User feedback
before acceptance sets `USER_CHANGES_REQUESTED`, appends the request to Goal and Acceptance,
resets `Round` to 0 and returns to `builder`. Reviewer blockers set `CHANGES_REQUESTED`; a
remaining blocker after round 2 sets `BLOCKED`, carrying the single decision for the user. A
`DONE` task is never reopened: a later requirement gets a new task ID. Evidence lines are
appended, never rewritten.

## File graph

The file graph is the local CodeGraph index in `.codegraph/` (SQLite, gitignored, not
committed), never a hand-maintained document. Stage agents use the `codegraph` CLI:
`context "<task>"`, `files`, `query`, `node`, `impact`, `affected`, and `sync` after a
change.

## Mirrors

The same three agents exist in three formats:

| Directory                   | Format                | Role            |
| --------------------------- | --------------------- | --------------- |
| `.qoder/agents/*.md`        | Qoder custom agents   | source of truth |
| `.opencode/agents/*.md`     | OpenCode subagents    | mirror          |
| `.github/agents/*.agent.md` | GitHub Copilot agents | mirror          |

When a workflow rule changes, update the source first, then the two mirrors, and only when
the user explicitly requests the cross-folder change.

## Settings folder ownership

Touch only your own settings folder (agents, instructions, skills, commands): `.qoder/` for
Qoder, `.opencode/` for OpenCode, `.github/` for Copilot. Never edit another configuration
folder unless the user explicitly requests that cross-folder change.

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
- Full E2E suite, once per task, on the task branch, in a single run:
  `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`,
  then the same command with `down -v --remove-orphans`.

A task is never `DONE` until the full E2E suite passes on its branch in a single run: every
spec and every test green, with no test passing only on a retry. This applies to every task
and every size, including documentation and configuration changes. If the E2E gate cannot run
(for example Docker unavailable), the task stays `BLOCKED` and the unverified gate is
reported; it is never marked done on partial evidence.

Stage agents never call a real LLM in automated tests: `mock-ollama` is deterministic.
