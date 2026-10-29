# AGENT-SETTINGS-OWNERSHIP

Status: DONE
Branch: chore/agent-settings-ownership
Size: S
Round: 0/2

Goal: Add "touch only your own settings folder" to all three harness configs; cross-folder edits only on explicit user request. Out of scope: models, permissions, agents, skills, code, contract, tests.
Files: Writable `.qoder/README.md`, `.opencode/instructions/00-absolute-rules.md`, `.github/copilot-instructions.md` · Context `AGENTS.md` · Affected tests: none (docs only).
Constraints: English · canonical rule once per file · no commit or push · no other file changed.
Acceptance: rule present once in each file naming its folder and the explicit-request exception; only the 3 docs changed; `git diff --check` clean.
Commands: `grep -n "Touch only your own settings folder" .qoder/README.md .opencode/instructions/00-absolute-rules.md .github/copilot-instructions.md`; `git diff --name-only && git diff --check && git diff --stat`.

## Evidence

- 2026-10-23 lead: sized S; branch `chore/agent-settings-ownership` created from clean HEAD; routed to builder only.
- 2026-10-23 builder: red→green on acceptance grep: 0 matches (exit 1) before edit, 3 matches / 3 files after.
- 2026-10-23 builder: `.qoder/README.md` section after Mirrors + mirror sentence qualified; `.opencode/instructions/00-absolute-rules.md` section at end; `.github/copilot-instructions.md` section after Workflow.
- PASS `grep -n "Touch only your own settings folder" ...` → 3 matches, exactly one per file (qoder:92, opencode:70, github:95).
- PASS `git diff --name-only` → the 3 writable docs only; handoff untracked (`??`), no other path.
- PASS `git diff --check` → exit 0, no output.
- PASS `git diff --stat` → 3 files changed, 18 insertions(+), 1 deletion(-).
- 2026-10-23 builder: `codegraph affected` → no test files affected (docs only; no `codegraph sync`). Contract: none. Deviations: none.
- 2026-10-23 lead: S diff skim — 3 config docs, 18 insertions/1 deletion; grep 3/3, `git diff --check` exit 0; no app/contract/test change; USER_REVIEW.
- 2026-10-23 lead: DONE — user accepted.
