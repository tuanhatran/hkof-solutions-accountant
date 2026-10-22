# OpenAPI contract

`openapi/openapi.yaml` is the source of truth between the backend and the frontend.

## Mandatory procedure

1. Read the relevant part of the YAML and `product_prompt.md`.
2. Change the YAML **first**: path, method, parameters, request schema, response schema,
   error codes.
3. Check consistency: amounts as decimal strings, ISO dates, `ProblemDetail` errors.
4. Implement the backend against that contract.
5. Regenerate the types: `cd frontend && npm run gen:api`.
6. Adapt the frontend calls and hooks.
7. Add or update tests on both sides.
8. Report the contract change explicitly in the deliverable: paths, fields added, changed
   or removed, frontend impact.

## Schema rules

- Amounts: `type: string` with a decimal pattern (`"123.45"`) or integer cents. Never
  `number`/`float` for an authoritative monetary value.
- Errors: `application/problem+json`, `ProblemDetail` (RFC 9457), messages in French for
  the end user.
- Logical deletion: deleted resources are not returned by default; an explicit filter may
  request them.
- Pagination and sorting: named and documented parameters, never implicit.
- No internal field (LLM key, secret, server path) in a response schema.
- A contract change without a YAML change is a blocking defect.

## Generation

```bash
cd frontend && npm run gen:api
```

The generated file `frontend/src/api/schema.ts` is never edited by hand.
