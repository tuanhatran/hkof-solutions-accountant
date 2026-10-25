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
cd backend && ./mvnw -B verify          # tests + JaCoCo 90% LINE / 90% BRANCH gate
cd frontend && npm ci && npm test && npm run build
cd frontend && npm run test:coverage   # Vitest 90% gate
cd frontend && npm run lint            # ESLint
cd frontend && npm run format:check    # Prettier
cd frontend && npm run build           # tsc + Vite build, same as CI
cd frontend && npm run gen:api         # after an OpenAPI change
make up / make down
```

## Coverage and size gate

- Every new task keeps JaCoCo bundle coverage at >= 90% LINE and >= 90% BRANCH:
  `cd backend && ./mvnw -B verify` is the gate.
- Every new task keeps Vitest global coverage at >= 90% lines, statements, functions and
  branches: `cd frontend && npm run test:coverage` is the gate.
- Every production class stays under 300 lines. A class crossing 300 lines is split, never
  shrunk by deleting comments only.
- The handoff carries one evidence line with the real coverage numbers of the task.

## Gates by change type

The table in `builder.md` (End of task) is the single source: docs-only, tests-only and CSS-only
changes skip coverage and E2E; production code, contract, migration or Docker/E2E config run the
matching coverage gates (frontend includes `npm run build`) plus one full E2E run.

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
- Assumptions recorded in `README.md`, section "Assumptions", or in the task report.
- Report any change to a file owned by another block.
- Technical reports in English; user-facing excerpts keep their French wording.
