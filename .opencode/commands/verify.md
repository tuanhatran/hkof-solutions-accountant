---
description: Run the project verification suite and report actual results
---

Load the `verification-before-completion` skill and verify this change: $ARGUMENTS

Run the relevant commands from `.opencode/instructions/40-verification.md`:

```bash
make test
cd frontend && npm run typecheck
```

Also run `make e2e` when the change affects a user flow, unless Docker or time makes it
impossible. Report the exact commands, the actual output, test counts, failures and
anything left unverified. Do not claim success without evidence.
