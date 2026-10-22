# Verification and definition of done

## Before coding

- Read `product_prompt.md` for the relevant scope.
- Check whether `openapi/openapi.yaml` must change.
- For any behavior change, write the failing test first (see the `test-driven-development` skill).
- For any bug, find the root cause before changing code (see the `systematic-debugging` skill).

## Commands

```bash
make dev                               # database, backend, Vite
make test                              # backend tests, frontend tests, build
make e2e                               # Cypress against the Compose stack + mock-ollama
cd backend && ./mvnw -B test
cd frontend && npm ci && npm test && npm run build
cd frontend && npm run typecheck
cd frontend && npm run gen:api         # after an OpenAPI change
make up / make down
```

## Evidence before claims

- Never say "done", "passing" or "green" without running the relevant command and reading
  its output.
- Report actual results: test counts, failures, warnings, exact command.
- If a verification cannot run (Docker missing, network, time), say so explicitly and list
  what remains unverified.
- A flaky test is fixed, not disabled.

## Deliverable

- Summary of changes and touched files.
- Explicit notice of any OpenAPI contract change.
- Tests added or updated, with their result.
- Assumptions recorded in `README.md`, section "Hypothèses", or in the task report.
- Report any change to a file owned by another block.
- Technical reports in English; user-facing excerpts keep their French wording.
