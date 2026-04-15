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

## Key File

`src/services/roomService.ts` — turn validation, seat management, broadcasting redacted snapshots.

## Room Lifecycle

```
WAITING → ACTIVE
```

Seat 0 is always the host.

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
