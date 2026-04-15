# multiplayer-protocol

Shared DTO and message-shape package. No runtime dependencies — consumed by both the web app and the realtime API.

## Key Files

- `src/index.ts` — HTTP DTOs (room create/join) and WebSocket message shapes
- `src/views/index.ts` — Zod-validated redacted client views

## Design Rules

- The online client always renders as `players[0]` (viewer-relative rotation)
- Opponent hands are redacted to slot counts only — never expose card values to the opponent

## Tests

```bash
pnpm --filter @skipbo/multiplayer-protocol test
```

Tests live in `tests/`. When changing DTOs, redaction logic, or WebSocket shapes:
1. Update tests here
2. Update `apps/realtime-api/tests`
3. Update `docs/protocols/realtime-events.md`
