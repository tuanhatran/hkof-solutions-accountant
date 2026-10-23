# AGENT-MODELS-ROLLBACK

Status: DONE
Branch: feat/confirm-ai-amount
Size: M
Round: 2

## Goal — Restore lead writability (branch creation, `.handoff/` writes for every size) and the model split: `lead` and `builder` = `opencode/deepseek-v4.1-flash-free`, `reviewer` = `opencode/glm-5.3-flash-free`. Out of scope: reviewer permissions, `opencode.json` guards, application code, contract.

## Files — Context (read only): `.qoder/agents/reviewer.md`, `.qoder/agents/builder.md`, `.github/agents/reviewer.agent.md`, `AGENTS.md` | Writable: `.opencode/agents/lead.md`, `.qoder/agents/lead.md`, `.github/agents/lead.agent.md`, `.qoder/agents/README.md`, `.opencode/README.md`, `.opencode/opencode.json` | Affected tests: none (configuration only)

## Constraints — Contract: none | Money: n/a | No commit or push | Reviewer stays read-only | English docs

## Acceptance

- [ ] `grep -rn nemotron .opencode .qoder .github AGENTS.md` returns nothing
- [ ] `.opencode/agents/lead.md` has no deny permission block and pins deepseek
- [ ] The three mirrors agree on the model split
- [ ] No application, contract or test file changed

## Commands — `grep -rn nemotron .opencode .qoder .github AGENTS.md`; `python3 -c "import yaml,sys; [yaml.safe_load(open(p).read().split('---')[1]) for p in sys.argv[1:]]" .opencode/agents/*.md`; `git status --porcelain`

## Evidence

- 2026-10-23 lead: sized M; user chose the current branch, no new branch (deviation from the one-branch rule).
- 2026-10-23 lead: `grep -rn nemotron .opencode .qoder .github AGENTS.md` 0 matches PASS.
- 2026-10-23 lead: model grep 14 matches — lead/builder deepseek (8), reviewer glm (6) PASS.
- 2026-10-23 lead: frontmatter PyYAML 3/3 parse — lead deepseek, builder deepseek, reviewer glm PASS.
- 2026-10-23 lead: `git status --porcelain` 6 paths, all writable PASS.
- 2026-10-23 lead: `diff` Models sections byte-identical PASS.
- 2026-10-23 builder: round-2 fix — opencode.json comment corrected, handoff trimmed to 25 lines; JSON parses OK.
- 2026-10-23 reviewer: BLOCKERS (1) round 1 — `.opencode/opencode.json` comment still described a read-only lead.
- 2026-10-23 reviewer: PASS round 2 — comment fixed, 8 git guards and `default_agent: lead` unchanged, no evidence line lost.
- 2026-10-23 lead: DONE — user accepted
