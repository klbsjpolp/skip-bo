# realtime-api

AWS Lambda backend for online multiplayer. DynamoDB for persistence.

## Entry Points

| Handler | Trigger |
|---------|---------|
| `createRoom` | HTTP POST |
| `joinRoom` | HTTP POST |
| `connect` | WebSocket $connect |
| `disconnect` | WebSocket $disconnect |
| `message` | WebSocket $default |

## Local Dev

```bash
pnpm --filter @skipbo/realtime-api dev   # tsx watch src/local-dev.ts → http://127.0.0.1:8787
```

Set `VITE_SKIPBO_API_URL=http://127.0.0.1:8787` in the web app to connect.

## Key Files

- `src/services/roomService.ts` — turn validation, seat management, broadcasting redacted snapshots
- `src/services/gameState.ts` — action validation (`validateOnlineAction`), state application (`applyOnlineAction`), debug action gate

## Room Lifecycle

```
WAITING → ACTIVE → FINISHED
```

Seat 0 is always the host. `handleAction` uses an optimistic-retry loop (up to 5 attempts) to handle DynamoDB version conflicts.

## Debug Actions

`DEBUG_WIN` and `DEBUG_FILL_BUILD_PILE` are allowed by the server only when `process.env.NODE_ENV !== 'production'`. They bypass the current-player turn check so any connected player can trigger them.

## Tests

```bash
pnpm --filter @skipbo/realtime-api test
```

Tests live in `tests/`. When changing room lifecycle, protocol shapes, or redaction:
1. Update tests here
2. Update `packages/multiplayer-protocol/tests`
3. Update `docs/protocols/realtime-events.md` and `docs/architecture/online-multiplayer.md`

## Infra

```bash
pnpm tofu:fmt
pnpm --dir infra/terraform validate:offline:prod
```

Runbook: `docs/runbooks/opentofu-aws-realtime.md`
