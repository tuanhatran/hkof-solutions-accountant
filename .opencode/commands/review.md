---
description: Review current changes for correctness, regressions and missing tests
agent: plan
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

List findings by severity with file and line references. Do not edit files.
