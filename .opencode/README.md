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
- `.opencode/agents/*.md` are agents available through the `subagent` tool. All three use
  `mode: all` so they can also be invoked directly. `lead` dispatches `builder` and
  `reviewer`, which needs `experimental.subagent_depth: 2` in `opencode.json`. Pipeline by
  size: `S` = builder only, `M` = builder + one review, `L` = builder + at most two review
  rounds. Task handoffs live in the shared `.handoff/tasks/` tree, also used by the Qoder and
  Copilot agents.
- Global permissions in `opencode.json` deny `git commit`, `push`, `reset`, `clean`,
  `stash`, `worktree` and branch deletion.

## Relation to the other configuration directories

| Concern | Source of truth | OpenCode mirror |
| --- | --- | --- |
| Product spec | `product_prompt.md` | read directly |
| Root rules | `AGENTS.md` | loaded directly |
| Copilot guidance | `.github/copilot-instructions.md` | same conventions |
| Superpowers skills | `.qoder/skills` | registered in `opencode.json` |
| Agent workflow | `.qoder/agents/*.md` | `.opencode/agents/*.md` |
| Task handoffs | `.handoff/tasks/*.md` | same shared tree |
| File graph | CodeGraph index in `.codegraph/` | `codegraph` CLI, shared |
| Detailed rules | this directory | instructions |

When a rule changes, update the source of truth first, then mirror it here. Do not let
`.qoder/agents`, `.opencode/agents` and `.github/agents` diverge: the same agents, scope
and exit criteria must appear in all three.

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
