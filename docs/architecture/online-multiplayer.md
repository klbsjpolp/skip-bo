# Online Multiplayer Architecture

## Document Contract

- Purpose: describe how the online multiplayer system is partitioned and why the current architecture works the way it does.
- Audience: contributors and agents changing realtime room lifecycle, view serialization, or the online client flow.
- Source of truth: `apps/realtime-api/src/services/roomService.ts`, `packages/multiplayer-protocol/src/index.ts`, and `packages/multiplayer-protocol/src/views/index.ts`.
- When to update: when authority boundaries, transport model, room flow, or major runtime components change.

## Related Docs

- [source-of-truth.md](source-of-truth.md)
- [runtime-invariants.md](runtime-invariants.md)
- [decision-log.md](decision-log.md)
- [../protocols/realtime-events.md](../protocols/realtime-events.md)
- [../runbooks/opentofu-aws-realtime.md](../runbooks/opentofu-aws-realtime.md)

## Boundaries

- `apps/web` owns the online client runtime, room creation and join flows, and client-side animation inferred from snapshots.
- `apps/realtime-api` owns room lifecycle, turn validation, seat presence, and broadcasting.
- `packages/game-core` owns gameplay rules reused by the backend.
- `packages/multiplayer-protocol` owns HTTP DTOs, WebSocket message shapes, room-code helpers, and redacted client views.
- `infra/terraform` owns the AWS infrastructure that hosts the realtime API.

## Authority Model

Local AI games remain browser-owned. Online rooms are server-authoritative:

- the server creates waiting rooms, shuffles and deals active games, validates actions, and advances canonical state
- clients send intents such as `SELECT_CARD`, `PLAY_CARD`, `DISCARD_CARD`, `CLEAR_SELECTION`, and `END_TURN`
- the host can also send `startGame` once at least one other authenticated player is connected
- after each accepted action, the server broadcasts a fresh redacted snapshot
- clients render from snapshots rather than from replayed deltas

The underlying decision is recorded in [decision-log.md](decision-log.md).

## Room Lifecycle

- Room creation opens a four-seat private room in `WAITING` state.
- Seat `0` is the host seat.
- Each reserved seat carries a resolved player name, using the caller-provided name when present or a seat-based `Joueur #` fallback otherwise.
- Joining reserves the first open seat while the room is still `WAITING`.
- Presence broadcasts track which reserved seats currently have authenticated WebSocket connections.
- The game starts only when the host sends `startGame`.
- Start locks the active seat list to the seats connected at that moment, so active games can be 2, 3, or 4 players.
- Once active, turn order follows that locked active-seat list until the game finishes.

## Snapshot And Redaction Model

- The backend stores full room state.
- Each client receives a redacted view for its seat.
- Your own hand is sent with faces; opponent hands are sent as fixed-length hidden slots.
- Opponent hand selection exposes only slot-level selection, not card identity.
- Opponent stock piles expose only their visible top card.
- Public discard and build piles remain visible to every seat.
- The web client rotates snapshots into viewer-relative order so the receiving player is always rendered at `players[0]`.
- Player names live in `state.players[*].name`, so they survive the `WAITING` to `ACTIVE` transition and can be reused by UI surfaces without a separate roster mapping.
- Waiting-room snapshots can preserve the local private hand while keeping waiting public piles as placeholders. Active-game snapshots contain only the locked active seats.

The exact contract lives in [../protocols/realtime-events.md](../protocols/realtime-events.md).

## Client Composition

- `LocalGameBoard` preserves the browser-owned human-vs-AI board shell.
- `OnlineGameBoard` owns the viewer-relative online presentation and room-aware status controls.
- `OnlineStatusStrip` is the waiting-room control surface on the play screen. There is no separate lobby route or screen.
- Online animations are still inferred from snapshot diffs in the browser, but room status and legal state progression remain server-owned.

## Runtime Topology

The production stack is intentionally small:

- HTTP API Gateway for room creation and join
- WebSocket API Gateway for live updates
- Lambda handlers for create, join, connect, disconnect, and message handling
- DynamoDB for room state and active connections
- CloudWatch and Sentry for monitoring

Operational bootstrap and deploy steps live in [../runbooks/opentofu-aws-realtime.md](../runbooks/opentofu-aws-realtime.md).
