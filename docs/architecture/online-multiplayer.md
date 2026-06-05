# Online Multiplayer Architecture

## Document Contract

- Purpose: describe how the online multiplayer system is partitioned and why the current architecture works the way it does.
- Audience: contributors and agents changing realtime room lifecycle, view serialization, or the online client flow.
- Source of truth: `apps/realtime-api/src/services/roomService.ts`, `packages/realtime-core/src/index.ts`, and `packages/skipbo-runtime/src/{hostRuntime,views}.ts`.
- When to update: when authority boundaries, transport model, room flow, or major runtime components change.

## Related Docs

- [source-of-truth.md](source-of-truth.md)
- [runtime-invariants.md](runtime-invariants.md)
- [decision-log.md](decision-log.md)
- [../protocols/realtime-events.md](../protocols/realtime-events.md)
- [../runbooks/opentofu-aws-realtime.md](../runbooks/opentofu-aws-realtime.md)

## Boundaries

- `apps/web` owns the online client runtime, room create/join flows, the **host runtime** when the local seat is host, and client-side animation inferred from views.
- `apps/realtime-api` is a **game-agnostic relay**: room lifecycle, seat presence, an abstract turn pointer, and opaque message forwarding. No game logic.
- `packages/game-core` owns the pure Skip-Bo rules.
- `packages/realtime-core` owns the generic relay protocol, room/lobby/presence DTOs, and room-code helpers. **No dependency on game-core.**
- `packages/skipbo-runtime` owns the host-authoritative Skip-Bo runtime: rules application, hidden-information redaction, and per-seat `ClientGameView`. Consumed only by `apps/web`.
- `infra/terraform` owns the AWS infrastructure that hosts the realtime API.

## Authority Model

Local AI games are browser-owned. Online rooms are **host-authoritative**:

- The **server** never sees game state. It creates waiting rooms, runs the lobby,
  tracks presence, holds an abstract `currentSeatIndex`, and relays opaque messages.
- The **host** seat (seat 0) runs `SkipboHost`: it owns the full game state, validates
  and applies every move (its own and relayed guest moves), and produces a redacted
  `ClientGameView` for each seat.
- **Guests** send intents (`relay { kind: 'move' }`) and render the views the host relays.
- The server gates a `move` to the current seat and a `view`/control message to the host;
  it does not understand the move. Hidden information never leaves the host unredacted.

Trade-off: the host is trusted (it can cheat). Acceptable for friendly play; a
server-authoritative mode could return later for competitive games. The underlying
decision is recorded in [decision-log.md](decision-log.md).

## Room Lifecycle

- Room creation opens a four-seat private room in `WAITING`; seat `0` is the host.
- `createRoom` carries an opaque `gameId` (default `skipbo`) + `gameConfig`; the server stores them without interpreting them.
- Joining reserves the first open seat while the room is still `WAITING`.
- Presence broadcasts track which reserved seats have authenticated WebSocket connections.
- On `startGame` the server shuffles the connected seats into `activeSeatIndices`, sets the first turn, and broadcasts `gameStarted`. The host then builds the game and pushes the first views.
- Turn order follows the locked active-seat list; the host advances it with `setTurn`.
- The host disconnecting during `ACTIVE` pauses the game under the disconnect grace; on return it rebuilds from its `snapshotRestore` blob and re-pushes views. A guest reconnecting requests a resync from the host.

## Redaction Model

- Redaction runs **on the host**, per seat, via `serializeClientGameView`.
- Your own hand is sent with faces; opponent hands are fixed-length hidden slots.
- Opponent hand selection exposes only slot-level selection, not identity.
- Opponent stock piles expose only the visible top card; public discard/build piles stay visible.
- Views are viewer-relative: the receiving player is always rendered at `players[0]`.
- The server stores only one opaque host snapshot (for host reconnection) and never a redacted view.

The exact contract lives in [../protocols/realtime-events.md](../protocols/realtime-events.md).

## Client Composition

- `LocalGameBoard` preserves the browser-owned human-vs-AI board shell.
- `OnlineGameBoard` owns the viewer-relative online presentation and room-aware status controls.
- `OnlineStatusStrip` is the waiting-room control surface on the play screen; lobby data comes from `presence`.
- Host and guest share one rendering path (`ingestView`); online animations are inferred from successive `ClientGameView` diffs.

## Runtime Topology

The production stack is intentionally small (and unchanged by the relay model):

- HTTP API Gateway for room creation and join
- WebSocket API Gateway for live updates
- Lambda handlers for create, join, connect, disconnect, and message handling
- DynamoDB for room state (now opaque to the server) and active connections
- CloudWatch and Sentry for monitoring

A pure relay `move`/`event`/`view` does not write DynamoDB. This stack remains the
right fit for turn-based play; a persistent-connection tier would only be warranted
for high-frequency real-time games. Operational steps live in
[../runbooks/opentofu-aws-realtime.md](../runbooks/opentofu-aws-realtime.md).
