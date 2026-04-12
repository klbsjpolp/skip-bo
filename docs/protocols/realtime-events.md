# Realtime Event Protocol

## Document Contract

- Purpose: define the current HTTP and WebSocket contracts for online rooms.
- Audience: contributors and agents changing online DTOs, room codes, or client/server message handling.
- Source of truth: `packages/multiplayer-protocol/src/index.ts`, `packages/multiplayer-protocol/src/views/index.ts`, and backend enforcement in `apps/realtime-api/src/services/roomService.ts`.
- When to update: when any request shape, response shape, room-code rule, WebSocket message, or redaction rule changes.

## Related Docs

- [../architecture/online-multiplayer.md](../architecture/online-multiplayer.md)
- [../architecture/source-of-truth.md](../architecture/source-of-truth.md)
- [../runbooks/opentofu-aws-realtime.md](../runbooks/opentofu-aws-realtime.md)

## Room Codes

- Length: `5`
- Alphabet: Crockford base32
- Canonical output: uppercase
- Input parsing ignores case
- Aliases normalize as:
  - `O/o -> 0`
  - `I/i/L/l -> 1`

## HTTP Endpoints

### `POST /rooms`

Creates a private online room in `WAITING` state and seats the caller as host seat `0`.
Rooms currently expose four joinable seats. The game does not auto-start.

Request:

```json
{
  "stockSize": 35,
  "playerName": "Alice"
}
```

Notes:

- `playerName` is optional.
- Player names are limited to `10` characters after trimming.
- If omitted or blank, the server resolves the seat name as `Joueur #`, where `#` is the 1-based seat index.

Response:

```json
{
  "hostSeatIndex": 0,
  "roomCode": "7K2QF",
  "seatCapacity": 4,
  "seatIndex": 0,
  "seatToken": "<opaque bearer token>",
  "wsUrl": "wss://<api-id>.execute-api.ca-central-1.amazonaws.com/prod",
  "expiresAt": "2026-04-04T12:00:00.000Z"
}
```

### `POST /rooms/join`

Request:

```json
{
  "roomCode": "7k2qf",
  "playerName": "Bob"
}
```

Response matches the create payload, with `seatIndex` set to the first open seat.
Join is allowed only while the room is still in `WAITING`.

## WebSocket Client Messages

### `auth`

Sent first after opening the socket.

```json
{
  "type": "auth",
  "roomCode": "7K2QF",
  "seatIndex": 0,
  "seatToken": "<opaque bearer token>"
}
```

### `startGame`

Sent by the host after at least one other authenticated player is connected.
When accepted, the server locks the active seats to the currently connected players and broadcasts fresh snapshots.

```json
{
  "type": "startGame",
  "clientVersion": 3
}
```

### `action`

```json
{
  "type": "action",
  "action": {
    "type": "SELECT_CARD",
    "source": "hand",
    "index": 2
  }
}
```

### `ping`

```json
{
  "type": "ping"
}
```

## WebSocket Server Messages

### `snapshot`

Contains the authoritative redacted room view for the receiving seat.

```json
{
  "type": "snapshot",
  "view": {
    "currentPlayerIndex": 0,
    "players": [],
    "room": {
      "connectedSeats": [0, 1],
      "expiresAt": "2026-04-04T12:00:00.000Z",
      "hostSeatIndex": 0,
      "roomCode": "7K2QF",
      "seatCapacity": 4,
      "status": "ACTIVE",
      "version": 3
    }
  }
}
```

Notes:

- `view.players` is serialized in viewer-relative order, so the receiving player is always at index `0`.
- `view.players[*].name` carries the resolved seat name, using the provided `playerName` when present and `Joueur #` otherwise.
- While the room is `WAITING`, the local player can still receive their private hand, while public piles for waiting seats remain placeholders until the host starts the game.
- Once the host starts the game, snapshots contain only the seats that were connected at start time.

### `actionRejected`

```json
{
  "type": "actionRejected",
  "code": "invalid_action",
  "reason": "Ce n’est pas votre tour."
}
```

### `presence`

Used for seat-connect and seat-disconnect updates.

```json
{
  "type": "presence",
  "room": {
    "connectedSeats": [0, 1],
    "expiresAt": "2026-04-04T12:00:00.000Z",
    "hostSeatIndex": 0,
    "roomCode": "7K2QF",
    "seatCapacity": 4,
    "status": "WAITING",
    "version": 2
  }
}
```

### `roomClosed`

```json
{
  "type": "roomClosed",
  "roomCode": "7K2QF",
  "status": "FINISHED"
}
```

## Redaction Rules

- The receiving player always sees their own hand and full stock pile.
- Opponent hand cards are serialized as fixed-length hidden slots.
- Opponent selection from hand exposes only the selected slot.
- Opponent stock piles expose only the visible top card; deeper stock cards stay hidden.
- Stock and discard selections can expose their visible source because those piles are public.
- Room metadata carries `hostSeatIndex`, `seatCapacity`, `status`, and `connectedSeats`; clients should use that metadata rather than inferring room lifecycle from the board alone.
- Clients should animate from semantic state changes between snapshots rather than trusting network timing.
