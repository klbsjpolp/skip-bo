# realtime-api

AWS Lambda backend for online multiplayer. DynamoDB for persistence.

**Game-agnostic relay.** This server holds **no game logic**. It manages rooms,
seats, the lobby, presence and an **abstract turn pointer**, and it relays opaque
messages between seats. It never inspects payloads. Hidden-information redaction
and game rules live in the host client (`@skipbo/skipbo-runtime`). It depends only
on `@skipbo/realtime-core`.

## Entry Points

| Handler      | Trigger               |
| ------------ | --------------------- |
| `createRoom` | HTTP POST             |
| `joinRoom`   | HTTP POST             |
| `connect`    | WebSocket $connect    |
| `disconnect` | WebSocket $disconnect |
| `message`    | WebSocket $default    |

## Local Dev

```bash
pnpm --filter @skipbo/realtime-api dev   # tsx watch src/local-dev.ts → http://127.0.0.1:8787
```

Set `VITE_SKIPBO_API_URL=http://127.0.0.1:8787` in the web app to connect.

## Key Files

- `src/services/roomService.ts` — rooms, seats, lobby, presence, and the relay:
  - `handleRelay` — relays `move`/`event`/`view`; gates a `move` to the current seat, `view` to the host
  - `handleSetTurn` / `handleSnapshot` / `handleEndGame` — host-only control messages
  - `startGame` — shuffles seats, sets the first turn, broadcasts `gameStarted`
  - `authenticateConnection` — replays the host snapshot via `snapshotRestore`

## Room Lifecycle

```
WAITING → ACTIVE → FINISHED
```

Seat 0 is always the host. State-changing handlers use an optimistic-retry loop
(up to 5 attempts) for DynamoDB version conflicts. A pure relay (`move`/`event`/
`view`) does not write the room. The host disconnecting during `ACTIVE` is held
under the disconnect grace (the game pauses); it only closes the room during
`WAITING`.

## Turn gating & debug

The server gates a `relay { kind: 'move' }` to `room.currentSeatIndex` only — it
does not know what the move is. Debug actions (e.g. `DEBUG_WIN`) are sent by the
client as `relay { kind: 'event' }` so they bypass the turn gate; the **host**
applies and gates them behind its own `import.meta.env.DEV` flag.

## Tests

```bash
pnpm --filter @skipbo/realtime-api test
```

Tests live in `src/**/__tests__/` (co-located with the code under test). When changing room lifecycle, protocol shapes, or relay gating:

1. Update tests here
2. Update `packages/realtime-core/tests` (protocol) and `packages/skipbo-runtime/tests` (redaction)
3. Update `docs/protocols/realtime-events.md` and `docs/architecture/online-multiplayer.md`

## Infra

```bash
pnpm tofu:fmt
pnpm --dir infra/terraform validate:offline:prod
```

Runbook: `docs/runbooks/opentofu-aws-realtime.md`
