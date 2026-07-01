# Realtime Event Protocol

> **Moved:** the generic relay protocol and its server enforcement now live in the shared
> [realtime-infra](https://github.com/klbsjpolp/realtime-infra) repo — the published
> `@klbsjpolp/realtime-core` package plus the relay server — consumed here from npm. This page
> is kept as an orientation reference; the canonical source is realtime-infra. Only the
> **Skip-Bo-specific** payloads (`packages/skipbo-runtime/src/actionSchema.ts`) and redaction
> (`views.ts`) are owned in this repo.

## Document Contract

- Purpose: define the current HTTP and WebSocket contracts for online rooms.
- Audience: contributors and agents changing online DTOs, room codes, or client/server message handling.
- Source of truth: `@klbsjpolp/realtime-core` (generic relay protocol + DTOs, in realtime-infra),
  `packages/skipbo-runtime/src/views.ts` (Skip-Bo redaction) + `actionSchema.ts` (move payloads).
- When to update: when any request shape, response shape, room-code rule, WebSocket message, or redaction rule changes.

## Model: host-authoritative relay

`PROTOCOL_VERSION = 2`. The server is a **game-agnostic relay**: it manages rooms,
seats, the lobby, presence and an **abstract turn pointer** (`currentSeatIndex`),
and forwards opaque messages between seats. It never inspects payloads. The
**host** seat (seat 0) runs the game (`@skipbo/skipbo-runtime`), validates moves,
and produces a **redacted `ClientGameView` per seat**. Guests send intents and
render the views the host relays. v1 clients are rejected at `auth` with HTTP 426.

## Related Docs

- [../architecture/online-multiplayer.md](../architecture/online-multiplayer.md)
- [../architecture/source-of-truth.md](../architecture/source-of-truth.md)
- [../runbooks/opentofu-aws-realtime.md](../runbooks/opentofu-aws-realtime.md)

## Room Codes

- Length: `3`
- Alphabet: 23 uppercase letters (`A-Z` excluding the ambiguous `I`, `L`, `O`)
- Canonical output: uppercase; input parsing ignores case

## HTTP Endpoints

### `POST /rooms`

Creates a private room in `WAITING` and seats the caller as host seat `0` (4 joinable seats).

Request:

```json
{ "gameId": "skipbo", "gameConfig": { "stockSize": 35 }, "playerName": "Alice" }
```

- All fields optional. `gameId` defaults to `"skipbo"`. `gameConfig` is **opaque** to
  the server (stored and echoed back in `gameStarted`); Skip-Bo reads `stockSize` from it.
- `playerName` ≤ 10 chars after trimming; blank/omitted resolves to `Joueur #` (1-based seat).

Response (`RoomSession`): `{ hostSeatIndex, roomCode, seatCapacity, seatIndex, seatToken, wsUrl, expiresAt }`.

### `POST /rooms/join`

Request: `{ "roomCode": "kmp", "playerName": "Bob" }` (room code case-insensitive). Returns a
`RoomSession` for the first open seat. Allowed only while the room is `WAITING`.

## WebSocket

Open `wsUrl`, then send `auth`. All messages are JSON. Inbound is validated by
`clientMessageSchema` (`packages/realtime-core/src/schemas/websocket.ts`); unknown
shapes are dropped as `actionRejected`.

### Client → server

| Type                                                           | Shape                                                  | Notes                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| `auth`                                                         | `{ protocolVersion, roomCode, seatIndex, seatToken }`  | `protocolVersion` must be ≥ 2                           |
| `relay`                                                        | `{ kind: 'move'\|'event'\|'view', payload, toSeats? }` | `payload` opaque; `toSeats` defaults to all other seats |
| `setTurn`                                                      | `{ currentSeatIndex }`                                 | host only                                               |
| `snapshot`                                                     | `{ payload }`                                          | host only; opaque full-state blob for host reconnection |
| `endGame`                                                      | `{ winnerSeatIndex }`                                  | host only                                               |
| `startGame`                                                    | `{ clientVersion? }`                                   | host only                                               |
| `setReady` / `setUnready` / `kickSeat` / `leaveLobby` / `ping` | lobby/session                                          | unchanged                                               |

Gating: a `move` is accepted only from `room.currentSeatIndex`; `view` only from
the host. Debug actions are sent as `relay { kind: 'event', payload: { move } }`
to bypass the turn gate — the host applies them behind its own DEV flag.

The host also broadcasts its finalized end-of-game stats as
`relay { kind: 'event', payload: { gameStats } }` once the game ends. Only the
host's own `GameStatsRecord` (computed from its own state, with no network
delay) is trustworthy; guests display and persist that record instead of
reconstructing their own from asynchronously-delivered `view`s, which would
otherwise show a different duration/turn count per seat.

### Server → client

| Type              | Shape                                                 | Notes                                                            |
| ----------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| `presence`        | `{ room: RoomSummary }`                               | lobby/connectivity; `RoomSummary` carries `currentSeatIndex`     |
| `relayed`         | `{ fromSeat, kind, payload }`                         | an opaque message forwarded from another seat                    |
| `turn`            | `{ currentSeatIndex }`                                | abstract turn changed                                            |
| `gameStarted`     | `{ activeSeatIndices, currentSeatIndex, gameConfig }` | seats shuffled; the host builds the game from this               |
| `snapshotRestore` | `{ payload }`                                         | sent to the **host** on reconnect (its last snapshot, or `null`) |
| `roomClosed`      | `{ roomCode, status }`                                | room ended/closed                                                |
| `actionRejected`  | `{ code, reason }`                                    | validation / permission / turn rejection                         |

Flow: host `startGame` → server shuffles seats, sets the first turn, broadcasts
`gameStarted` → the host builds its `SkipboHost`, relays a `view` to each guest,
and pushes a `snapshot`. Each subsequent move (guest `relay move` or the host's
own move) is applied by the host, which then re-pushes views, `setTurn` (when the
turn changes), a `snapshot`, and `endGame` on completion.

## Redaction (Skip-Bo)

Computed by the host via `serializeClientGameView` (`packages/skipbo-runtime/src/views.ts`).
The server never redacts — opaque `view` payloads pass straight through.

- The receiving player always sees their own hand and full stock pile (viewer is `players[0]`).
- Opponent hand cards are fixed-length hidden slots (`HIDDEN_CARD`); an opponent hand
  selection exposes only the selected slot.
- Opponent stock piles expose only the visible top card; deeper cards stay hidden.
- Stock and discard selections may expose their visible source (those piles are public).
- `RoomSummary` carries `hostSeatIndex`, `seatCapacity`, `status`, `connectedSeats` and the
  abstract `currentSeatIndex`; use that metadata rather than inferring lifecycle from the board.
- Clients animate from semantic state changes between successive views, not network timing.
