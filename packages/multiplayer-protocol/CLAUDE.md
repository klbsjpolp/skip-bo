# multiplayer-protocol

Shared DTO and message-shape package. No runtime dependencies — consumed by both the web app and the realtime API.

## Key Files

- `src/schemas/websocket.ts` — `gameActionSchema` (Zod): every WebSocket action is validated here before reaching the server
- `src/views/index.ts` — Zod-validated redacted client views; this is where viewer-relative player rotation and hand redaction are enforced
- `src/index.ts` — re-exports for consumers

## Critical Gotcha

**Any new `GameAction` type added to `game-core` must also be added to `gameActionSchema` in `src/schemas/websocket.ts`.** The server calls `clientMessageSchema.parse()` on every incoming WebSocket message; unknown action types throw a `ZodError` and the message is silently dropped as an `actionRejected` response.

## Design Rules

- The online client always renders as `players[0]` (viewer-relative rotation, applied in `src/views/index.ts`)
- Opponent hands are redacted to slot counts only — never expose card values to the opponent

## Tests

```bash
pnpm --filter @skipbo/multiplayer-protocol test
```

Tests live in `tests/`. When changing DTOs, redaction logic, or WebSocket shapes:
1. Update tests here
2. Update `apps/realtime-api/tests`
3. Update `docs/protocols/realtime-events.md`
