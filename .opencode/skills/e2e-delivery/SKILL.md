---
name: E2E delivery
description: Use when writing or running HomeOfficeExpenses Cypress end-to-end tests, deterministic mock-ollama responses, fixtures or the E2E database reset. Covers full-stack verification without a real LLM.
---

# E2E delivery

## Rule

Prove the critical flows on the real stack, deterministically, with no external network.

## Stack

```bash
make e2e
# or
docker compose -p homeofficeexpenses-e2e \
  -f docker-compose.yml -f docker-compose.e2e.yml \
  up --build --abort-on-container-exit --exit-code-from cypress
```

- Ephemeral database.
- `mock-ollama` deterministic: `/api/tags`, `/api/show`, `/api/chat`, with controllable
  latency and responses selected by file name or content.
- Reset endpoint available only under the `e2e` profile.

## Test isolation

- Every test starts from a clean database through the reset endpoint.
- Never depend on a previous test or on execution order.
- Never depend on a real Ollama, real documents or the network.
- Fixtures are synthetic: no real names, addresses or amounts.

## Selectors

- Use the `data-cy` attributes from the specification only.
- Never use CSS classes, DOM structure or text matching as the primary selector.
- If an element has no `data-cy`, add the attribute required by the specification rather
  than working around it.

## Scenarios

Cover at minimum: configuration, receipt generation, tab state persistence, missing
receipt, the six expense types, prorata, rejected file formats, AI analysis, synchronized
preview, edit/delete, admin LLM, templates, full generation with attachments, regeneration.

## Assertions

- Assert visible French text for user feedback.
- Assert `total-retenu` against the backend-calculated value.
- Verify PDF downloads and, when possible, the extracted text.
- Assert that a failed analysis does not block the manual flow.
- Assert that the LLM key is never displayed after saving.

## Debugging

- An unstable scenario is a real defect: find the root cause, do not retry it away and
  do not skip it.
- Check the reset endpoint, the mock responses, then the timing.
- Load the `systematic-debugging` skill when the cause is unclear.

## Definition of done

- The suite is green locally and in CI.
- Execution time is controlled.
- Zero external network dependency.
- Report the exact command and the actual result.
