---
name: OpenAPI contract change
description: Use when adding, changing or removing any endpoint, request/response field or error in HomeOfficeExpenses, or when backend and frontend disagree about the API. Keeps openapi.yaml, backend DTOs and generated TypeScript types in sync.
---

# OpenAPI contract change

`openapi/openapi.yaml` is the only contract between backend and frontend. It is never
changed as an afterthought.

## Workflow

1. Read the current path and schema in `openapi/openapi.yaml`.
2. Read the matching section of `product_prompt.md`.
3. Decide whether the change is additive (new optional field, new endpoint) or breaking
   (rename, type change, removed field). State it in the report.
4. Edit the YAML first.
5. Implement the backend against it.
6. Regenerate the frontend types.
7. Update the frontend code and tests.
8. Report the contract change explicitly.

## YAML checklist

- Amounts are `type: string` with a decimal pattern (`"123.45"`) or integer cents.
  Never `number` or `float` for an authoritative amount.
- Errors use `application/problem+json` and the `ProblemDetail` shape (RFC 9457).
- Dates and timestamps are ISO strings; the month is `YYYY-MM`.
- No internal shape leaks: no LLM key, no secret, no server path in a response.
- Deleted resources are hidden by default; any include-deleted option is explicit.
- Every operation has a stable `operationId`.
- Required fields match what the backend actually validates.
- Backward compatibility: prefer adding an optional field over renaming an existing one.

## Backend side

- DTOs are records in `web/dto/Dtos.java` unless the project already splits them.
- Controllers stay thin: validation and mapping only, no calculation.
- A new business rule raises `BusinessException` or `NotFoundException`, translated to
  `ProblemDetail` with a French user-facing message.

## Frontend side

```bash
cd frontend && npm run gen:api
```

- Never edit `frontend/src/api/schema.ts`.
- Add or update calls in `frontend/src/api/endpoints.ts`.
- Add or update hooks and keys in `frontend/src/api/queries.ts`, using `queryKeys`
  constants and a prefix key when several list variants exist.
- Invalidate every affected key after a mutation.

## Verification

```bash
cd backend && ./mvnw -B test
cd frontend && npm run typecheck && npm test && npm run build
```

The change is not done until both sides compile and the tests referencing the changed
fields pass. Mention the YAML change in the deliverable even when it is purely additive.
