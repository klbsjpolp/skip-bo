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

Creates an online room and seats the caller as seat `0`.

Response:

```json
{
  "roomCode": "7K2QF",
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
  "roomCode": "7k2qf"
}
```

Response matches the create payload, with `seatIndex` equal to `1`.

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
  "connectedSeats": [0, 1],
  "game": {
    "currentPlayerIndex": 0,
    "players": [],
    "roomCode": "7K2QF",
    "status": "ACTIVE",
    "viewerSeatIndex": 0,
    "version": 3
  }
}
```

### `actionRejected`

```json
{
  "type": "actionRejected",
  "message": "Ce n’est pas votre tour."
}
```

### `presence`

Used for seat-connect and seat-disconnect updates.

```json
{
  "type": "presence",
  "connectedSeats": [0]
}
```

### `roomClosed`

```json
{
  "type": "roomClosed",
  "message": "La partie est expirée."
}
```

## Redaction Rules

- Opponent hand cards are never serialized.
- Opponent selection from hand exposes only the selected slot.
- Stock and discard selections can expose their visible source because those piles are public.
- Clients should animate from semantic state changes between snapshots rather than trusting network timing.
