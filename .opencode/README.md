# `.opencode` — OpenCode configuration

OpenCode project setup for HomeOfficeExpenses: instructions, agents and commands (skills live in `.qoder/skills`).

## Layout

```text
.opencode/
├── opencode.json              # instructions glob, extra skill source, git guards
├── README.md                  # this file
├── instructions/              # detailed rules loaded with AGENTS.md
│   ├── 00-absolute-rules.md
│   ├── 10-openapi-contract.md
│   ├── 20-backend.md
│   ├── 30-frontend.md
│   ├── 40-verification.md
│   └── 50-security-data.md
├── agents/                    # lead, builder, reviewer
└── commands/                  # /verify, /contract, /review
```

## How OpenCode loads it

- `AGENTS.md` at the repository root is loaded automatically.
- `opencode.json` adds `.opencode/instructions/*.md` through the `instructions` array.
- Skills: only the vendored Superpowers skills in `.qoder/skills` remain. OpenCode registers that
  folder through `skills.paths`; each agent's `permission.skill` is an allowlist. Copilot agents read
  the files by path. There is no `.opencode/skills`.
- `.opencode/agents/*.md` define the workflow: `lead` (`mode: primary`) is writable — it may
  edit `.handoff/` only, create the task branch with `git switch -c`, and route work to
  `builder` and `reviewer` one after the other, inline, never as nested subagents; `builder` has
  full edit and shell; `reviewer` is read-only (`edit` denied).
- Models pinned in frontmatter: `lead`, `builder` and `reviewer`
  `opencode/deepseek-v4.1-flash-free`. Qoder pins `DeepSeek-V4-Pro` (lead) and `DeepSeek-V4-Pro`
  (builder, reviewer); Copilot selects its own model.
- Sizing: `S` = up to 15 files, builder only; `M` = up to 25 files, builder then one review; `L` = up to 40
  files or a risk area, builder then at most two review rounds. Above 40 files the lead asks to split the
  task. Money, contract, migration, template sandbox, LLM or secrets always force a review.
- Handoffs are files, `.handoff/tasks/<TASK-ID>.md` from `.handoff/TEMPLATE.md`, written by the
  lead for every size (25 lines, 6 for S); the same tree is shared with the Qoder and Copilot
  mirrors.
- Global permissions in `opencode.json` deny `git push`, `reset`, `clean`, `stash`, `worktree`, `rebase`,
  branch deletion, `git commit --amend` and blanket staging (`git add -A`, `git commit -a`). Plain
  `git commit` is allowed: only `builder` commits, once per run.

## Quick dev (`/quick-dev <task>`)

`.opencode/commands/quick-dev.md` runs the `quick-dev` primary agent with `subtask: false`, and the
agent denies the `task` permission, so no subagent can start. No handoff and no review round; small changes only (fewer than 10 files), otherwise it stops and points to `lead`. It commits once, locally, with explicit paths.

## Relation to the other configuration directories

| Concern            | Source of truth                   | OpenCode mirror               |
| ------------------ | --------------------------------- | ----------------------------- |
| Product spec       | `product_prompt.md`               | read directly                 |
| Root rules         | `AGENTS.md`                       | loaded directly               |
| Copilot guidance   | `.github/copilot-instructions.md` | same conventions              |
| Skills (all)       | `.qoder/skills`                   | `skills.paths` in `opencode.json` |
| Agent workflow     | `.qoder/agents/*.md`              | `.opencode/` and `.github/` copies: same body, frontmatter differs |
| Task handoffs      | `.handoff/tasks/*.md`             | same shared tree              |
| File graph         | CodeGraph index in `.codegraph/`  | `codegraph` CLI, shared       |
| Detailed rules     | this directory                    | instructions                  |

When a rule changes, update `.qoder/agents` first, then copy the body unchanged to
`.opencode/agents` and `.github/agents` (only frontmatter and the Inputs/Models lines of `lead`
differ). Do not let `.opencode/agents`, `.qoder/agents` and `.github/agents`
diverge: the same agents, scope and exit criteria must appear in all three.

## Language policy

- Code, comments, documentation, instructions, agents, skills and reports: English.
- User-facing UI text, documents, toasts and error messages: French.
- Specification domain names stay French in the UI, documents and routes; code uses English names.

## Maintenance

- Keep instruction files short and operational; details belong in skills.
- Keep each agent self-contained (inputs, deliverables, rules, exit criteria).
- Skills use one directory per skill with `SKILL.md`; supporting files stay beside it.
- Never put secrets, real personal data or generated documents in this directory.
- Any new behavior change follows the Superpowers workflow:
  `brainstorming` → `writing-plans` → `test-driven-development` → `verification-before-completion`.
