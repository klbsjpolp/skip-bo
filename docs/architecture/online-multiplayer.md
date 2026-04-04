# Online Multiplayer Architecture

## Product shape

- The app still boots directly into a local game against AI.
- There is no lobby route and no dedicated waiting-room screen.
- `Nouvelle partie` opens a modal with three actions:
  - `Local vs AI`
  - `Start online`
  - `Join online`
- Online rooms are private, two-player matches joined by a 5-character Crockford base32 code.
- `Rejouer` preserves the game type. For online games it immediately creates a new hosted room for the local player.

## Monorepo boundaries

- `apps/web`: React application, AI, animation orchestration, modal flow, and online client runtime.
- `apps/realtime-api`: AWS Lambda handlers for room creation, room join, WebSocket auth, and live action handling.
- `packages/game-core`: shared reducer, validators, deck setup, initial state, and domain types.
- `packages/multiplayer-protocol`: HTTP DTOs, WebSocket message contracts, room-code helpers, and redacted client-view serializers.
- `infra/terraform`: production AWS infrastructure definition, applied with OpenTofu.

## Online authority model

Local AI games remain entirely browser-owned. Online games are server-authoritative:

- The server creates the room, shuffles, deals, validates turns, and advances the canonical state.
- Clients send intents such as `SELECT_CARD`, `PLAY_CARD`, `DISCARD_CARD`, `CLEAR_SELECTION`, and `END_TURN`.
- After every accepted online action, the server broadcasts a fresh redacted snapshot to both seats.
- No move replay or delta sync is used in v1.

## View serialization

The backend stores the full `GameState`. Clients never receive the full state for both players.

- Your own hand is sent with card faces.
- The opponent hand is sent as fixed-length hidden slots.
- Opponent hand selection is serialized as slot-level selection only.
- Visible piles remain visible to both players.
- The web client rotates the snapshot into the local viewer’s perspective so the existing board layout can stay stable.

## AWS runtime

The multiplayer backend uses:

- HTTP API Gateway for `POST /rooms` and `POST /rooms/join`
- WebSocket API Gateway for live room updates
- Lambda for the five handlers
- DynamoDB for room state and connection tracking
- CloudWatch Logs and basic Lambda error alarms

The stack is intentionally small because the expected concurrency is low, but it is reusable for other room-based games.
