---
description: Run the project verification suite and report actual results
---

Load the `verification-before-completion` skill and verify this change: $ARGUMENTS

Run the relevant commands from `.opencode/instructions/40-verification.md`:

Follow the gate table in the builder agent (End of task): run only the gates the change type
requires, once, and `make e2e` (only the touched E2E spec, `make e2e <spec>`, against the stack started once with
`make e2e-up`; keep it up until acceptance, then `make e2e-down`) when the table requires it. Frontend gates
are `npm run test:coverage`, `npm run lint`, `npm run format:check`, `npm run build`.
Changed-line coverage is gated by `scripts/diff-coverage.sh <Base> backend|frontend|all`
(>= 80%, JaCoCo XML for backend lines, Vitest Clover XML for frontend lines).
If Docker or time makes a required gate impossible, report it as unverified. Report the exact commands, the actual output, test counts, failures and
anything left unverified. Do not claim success without evidence.
