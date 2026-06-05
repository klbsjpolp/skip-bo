# realtime-core

Game-agnostic realtime substrate. **No game logic, no dependency on `game-core`.**
Shared by the relay server (`apps/realtime-api`) and any game client.

## What lives here

- `src/schemas/websocket.ts` — the **relay protocol** (Zod): `relay` envelope + host
  control messages (`setTurn`/`snapshot`/`endGame`) + lobby/auth messages. The server
  validates every inbound WS message against `clientMessageSchema`.
- `src/protocol/index.ts` — server→client message types (`relayed`, `turn`, `gameStarted`,
  `snapshotRestore`, `presence`, `roomClosed`, `actionRejected`).
- `src/room/index.ts` — room/lobby/presence DTOs (`RoomStatus`, `LobbySeatInfo`,
  `RoomSummary`, including the abstract `currentSeatIndex`).
- `src/schemas/http.ts` + `src/http/index.ts` — `createRoom`/`joinRoom` shapes. `createRoom`
  carries an opaque `gameId` + `gameConfig` the server never interprets.
- `code.ts`, `version.ts`, `playerName.ts`, `shuffle.ts` — generic helpers.

## Design rules

- **The server never inspects `payload`.** Game state and hidden-information redaction
  live entirely in the host-authoritative client (e.g. `@skipbo/skipbo-runtime`).
- `payload` fields are `z.unknown()` on purpose — do not narrow them here.
- `relay.kind`: `move` is gated to the current seat by the server; `view`/`snapshot`/
  `setTurn`/`endGame` are host-only; `event` is open to any authenticated seat.

## Tests

```bash
pnpm --filter @skipbo/realtime-core test
```
