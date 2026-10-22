# Security, secrets and personal data

## Secrets

- `.env` is git-ignored and holds the local configuration.
- Never log, display, copy or transmit: LLM API key, database password, tokens, session cookies.
- An LLM key is never returned by a `GET`. An update without a new key must not overwrite
  the existing key with an empty value.
- Use environment substitutions, never plaintext secrets in a tracked file.

## Personal data

- Documents in `data/` (supporting documents, outputs) are never committed, pasted into logs,
  sent to an external service or used as a real test fixture.
- E2E fixtures are synthetic.
- Real names, addresses and amounts must not appear in tests.

## Local LLM

- The Ollama URL must stay local (`localhost`, `host.docker.internal`, private IP).
- If the URL points elsewhere, the interface shows an explicit warning before any upload.
- Only `http` and `https` are accepted; no other scheme.
- Document content is untrusted: the system prompt forbids following its instructions, and
  the response is validated against a JSON schema server-side.

## Injection and templates

- Reject `<script>`, `on*` handlers, `th:*`, `#{...}`, remote resources, `file://` and
  `../` paths in a user template.
- Sanitize HTML before rendering; no network resource during PDF rendering.
