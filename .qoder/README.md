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

## Quick dev (`/quick-dev <task>`)

One agent, no handoff, no subagents, no review round, for small changes only (fewer than 10 files,
none of the money, contract, migration, sandbox, LLM or security areas). It stops and sends you back to
the lead pipeline when the scope is bigger. The protocol lives in `.qoder/agents/quick-dev.md`, which
sets `disallowedTools: [Agent]`; the command reads it. The agent commits once, locally, with explicit
paths. There is no independent review: use the lead pipeline when that matters.

## Git rules

Each task runs on one dedicated branch, created by the lead with an automatic name, `feat/<nn>-<slug>` (`fix/<nn>-<slug>` for a bug); the user is
not asked (`git switch -c`, validated with `git check-ref-format --branch`). The lead records `Base: <sha>`.
Resumed tasks reuse the branch recorded in their handoff. Dirty or staged changes are
preserved: agents never reset, clean, stash or overwrite them, and report a deviation if
Git refuses a switch.

Only `builder` commits: one local commit per run, explicit paths, never amended, never pushed.
No agent pushes, resets, cleans, stashes, creates worktrees, deletes branches or creates a second
branch for the same task. Reviews diff the commit range (`Base..HEAD`; round 2 the fix commit only).

## Contract

- `openapi/openapi.yaml` is the source of truth between backend and frontend.
- Frontend types are produced by `npm run gen:api` (`openapi-typescript`).
- The backend does not silently change the contract: any deviation is reported and carried
  through to the YAML and the generated types.
- Amounts are decimal strings (`"123.45"`) or integer cents, never JSON floats.

## Code conventions

The detailed rules live in `.opencode/instructions/*.md` and are read on demand. The
project-wide rules are:

### Backend — clean code and coverage

- `CalculationService` is pure: no Spring, no repository, no clock. Every monetary
  calculation lives there (`BigDecimal`, `RoundingMode.HALF_UP`, scale 2). Never duplicate
  it in a controller, a repository or an entity; never use `double` or `float`.
- Controllers stay thin: validation and mapping only, no business logic.
- Read service methods use `@Transactional(readOnly = true)`.
- `BusinessException` for a business rule, `NotFoundException` for a missing row; both
  become a `ProblemDetail` with a French user-facing message.
- Logical deletion only (`deleted`); queries use `findByDeletedFalse...`; a previous
  version is never overwritten.
- Flyway migrations are append-only: never edit an applied migration.
- Every new task keeps backend changed-line coverage >= 80%: `cd backend && ./mvnw -B verify`
  produces the JaCoCo XML report, then `scripts/diff-coverage.sh <Base> backend` is the gate.
  No global bundle threshold.
- Every production class stays under 300 lines. A class crossing 300 lines is split by
  responsibility, never shrunk by deleting comments only.

### Frontend — clean code and CSS

- TypeScript strict, no `any`; no authoritative monetary calculation on the client.
- Every HTTP call goes through `frontend/src/api/endpoints.ts`; hooks and keys live in
  `frontend/src/api/queries.ts` with `queryKeys` constants, never string literals.
- Forms use React Hook Form + Zod in `frontend/src/lib/validation.ts`; feedback goes
  through `toast` from `frontend/src/state/toasts.ts`.
- API amounts are strings; use the existing parsers and formatters. UI text is French;
  loading, error and empty states are mandatory; labels and keyboard access are required.
- E2E selectors use the specification's `data-cy` attributes, never style selectors.
- CSS: one colocated `<Component>.css` per styled component, imported first by the
  component, never by `main.tsx` and never through a barrel. Classes are prefixed with the
  component file name in kebab-case (`PageHeader.css` → `.page-header`,
  `.page-header-title`). Each file starts with `@reference "<relative>/index.css";` and
  wraps its rules in `@layer components`. Design-system primitives (`card`, `btn`, `field`,
  `badge`) stay on the element; add only the component-specific class. Values come from
  tokens (`var(--color-*)`, `var(--shadow-*)`, `var(--font-*)`) or `@apply` utilities,
  never hex literals. Conditional variants are separate classes combined with `cn()`.
  A component CSS stays under 300 lines and is split by block.
- Every new task keeps frontend changed-line coverage >= 80%: `cd frontend && npm run test:coverage`
  produces the Vitest Clover XML report, then `scripts/diff-coverage.sh <Base> frontend` is the
  gate. No global threshold.
- `npm run lint` and `npm run format` must pass (CI gate).

## Language

- Agent instructions, code, comments and reports are in English.
- User-facing strings only are in French (UI, documents, toasts, validation and API errors).
- Specification domain names stay French in the UI, documents and routes; code uses English
  names.

## Verification

- `cd backend && ./mvnw -B test`
- `cd frontend && npm run typecheck && npm run lint && npm run format && npm test && npm run build`
- Coverage gate for every task: changed-line coverage >= 80% via
  `scripts/diff-coverage.sh <Base> backend|frontend|all` (JaCoCo XML for backend lines,
  Vitest Clover XML for frontend lines); no global bundle threshold. The handoff carries one
  evidence line with the changed-line percentages and measured line counts.
- Every production class stays under 300 lines. A class crossing 300 lines is split, never
  shrunk by deleting comments only.
- Full E2E suite, once per task, on the task branch, in a single run: `make e2e-up` once, then
  `make e2e` (rebuilds only the changed services, keeps the stack up); `make e2e-down` removes
  the stack and its volumes only after the user accepts.

A task is never `DONE` until the full E2E suite passes on its branch in a single run: every
spec and every test green, with no test passing only on a retry. This applies to every task
and every size, including documentation and configuration changes. If the E2E gate cannot run
(for example Docker unavailable), the task stays `BLOCKED` and the unverified gate is
reported; it is never marked done on partial evidence.

Stage agents never call a real LLM in automated tests: `mock-ollama` is deterministic.
