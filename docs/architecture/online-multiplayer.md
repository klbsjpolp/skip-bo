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

- the server creates the room, shuffles, deals, validates actions, and advances canonical state
- clients send intents such as `SELECT_CARD`, `PLAY_CARD`, `DISCARD_CARD`, `CLEAR_SELECTION`, and `END_TURN`
- after each accepted action, the server broadcasts a fresh redacted snapshot
- clients render from snapshots rather than from replayed deltas

The underlying decision is recorded in [decision-log.md](decision-log.md).

## Snapshot And Redaction Model

- The backend stores full room state.
- Each client receives a redacted view for its seat.
- Your own hand is sent with faces; the opponent hand is sent as fixed-length hidden slots.
- Opponent hand selection exposes only slot-level selection, not card identity.
- Visible piles remain visible to both players.
- The web client rotates the snapshot into the local viewer's perspective so the board layout can stay consistent.

The exact contract lives in [../protocols/realtime-events.md](../protocols/realtime-events.md).

## Runtime Topology

The production stack is intentionally small:

- HTTP API Gateway for room creation and join
- WebSocket API Gateway for live updates
- Lambda handlers for create, join, connect, disconnect, and message handling
- DynamoDB for room state and active connections
- CloudWatch and Sentry for monitoring

Operational bootstrap and deploy steps live in [../runbooks/opentofu-aws-realtime.md](../runbooks/opentofu-aws-realtime.md).
