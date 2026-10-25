---
description: Review current changes for correctness, regressions and missing tests
agent: reviewer
---

Review the current changes for: $ARGUMENTS

Load the `requesting-code-review` skill if available. Focus on:

- monetary calculation outside `CalculationService`, or `double`/`float` usage;
- authoritative totals computed in the frontend;
- OpenAPI contract drift and hand-edited generated types;
- `any` in TypeScript, swallowed errors, bypassed tests;
- logical deletion and versioning violations;
- template or LLM input trusted without validation;
- secrets or real personal data exposed.

Report blockers only, at most 5, one line each: `file:line — behaviour that breaks — why it matters`,
then `VERDICT: PASS` or `VERDICT: BLOCKERS (n)`. Do not edit files.
