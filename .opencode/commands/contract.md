---
description: Plan and apply an OpenAPI contract change
---

Follow `.opencode/instructions/10-openapi-contract.md`.

Change the contract for: $ARGUMENTS

1. Read the current path and schemas in `openapi/openapi.yaml`.
2. State whether the change is additive or breaking.
3. Edit the YAML first.
4. List the backend and frontend files that must change.
5. Regenerate the frontend types with `cd frontend && npm run gen:api`.
6. Report the contract diff explicitly.

Do not implement until the YAML change is clear and consistent.
