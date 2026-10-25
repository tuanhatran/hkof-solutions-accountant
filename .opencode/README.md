# `.opencode` — OpenCode configuration

OpenCode project setup for HomeOfficeExpenses: instructions, agents, skills and commands.

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
├── skills/                    # project skills (English)
│   ├── openapi-contract/
│   ├── backend-delivery/
│   ├── frontend-delivery/
│   ├── pdf-templates/
│   ├── llm-extraction/
│   └── e2e-delivery/
└── commands/                  # /verify, /contract, /review
```

## How OpenCode loads it

- `AGENTS.md` at the repository root is loaded automatically.
- `opencode.json` adds `.opencode/instructions/*.md` through the `instructions` array.
- `.qoder/skills` is registered as an extra skill source, so the vendored Superpowers
  skills remain the single copy.
- `.opencode/skills/*/SKILL.md` are project skills, advertised by their `description`.
- `.opencode/agents/*.md` define the workflow: `lead` (`mode: primary`) is writable — it may
  edit `.handoff/` only, create the task branch with `git switch -c`, and route work to
  `builder` and `reviewer` one after the other, inline, never as nested subagents; `builder` has
  full edit and shell; `reviewer` is read-only (`edit` denied).
- Models pinned in frontmatter: `lead`, `builder` and `reviewer`
  `opencode/deepseek-v4.1-flash-free`. Qoder pins the equivalent `DeepSeek-Flash`; Copilot
  selects its own model.
- Sizing: `S` = 1-2 files, builder only; `M` = 3-5 files or some risk, builder then one review;
  `L` = 6+ files, new architecture or unclear requirements, builder work items run one at a time
  then one review on the combined diff. Money, contract, migration, template sandbox, LLM or secrets always
  force a review.
- Handoffs are files, `.handoff/tasks/<TASK-ID>.md` from `.handoff/TEMPLATE.md`, written by the
  lead for every size (25 lines, 6 for S); the same tree is shared with the Qoder and Copilot
  mirrors.
- Global permissions in `opencode.json` deny `git commit`, `push`, `reset`, `clean`,
  `stash`, `worktree` and branch deletion.

## Relation to the other configuration directories

| Concern            | Source of truth                   | OpenCode mirror               |
| ------------------ | --------------------------------- | ----------------------------- |
| Product spec       | `product_prompt.md`               | read directly                 |
| Root rules         | `AGENTS.md`                       | loaded directly               |
| Copilot guidance   | `.github/copilot-instructions.md` | same conventions              |
| Superpowers skills | `.qoder/skills`                   | registered in `opencode.json` |
| Agent workflow     | `.opencode/agents/*.md`           | upstream (source of truth)    |
| Task handoffs      | `.handoff/tasks/*.md`             | same shared tree              |
| File graph         | CodeGraph index in `.codegraph/`  | `codegraph` CLI, shared       |
| Detailed rules     | this directory                    | instructions                  |

When a rule changes, update `.opencode` first, then mirror it to `.qoder/agents` and
`.github/agents`. Do not let `.opencode/agents`, `.qoder/agents` and `.github/agents`
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
