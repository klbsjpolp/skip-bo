# skipbo-runtime

Host-authoritative Skip-Bo runtime. Holds the game rules and the
hidden-information redaction that **used to live on the server**. Depends on
`game-core` (pure rules) + `realtime-core` (generic DTOs). Consumed by `apps/web`
when a client acts as the room host (seat 0). **The server never imports this.**

## Key files

- `src/hostRuntime.ts` — `SkipboHost`: owns `GameState`, maps abstract seat
  indices ↔ player-array order, validates+applies relayed moves, and produces a
  redacted `ClientGameView` per seat. Snapshot in/out for host reconnection.
- `src/gameLogic.ts` — `validateOnlineAction` / `applyOnlineAction` /
  `createOnlineInitialGameState` / `isDebugAction` (moved from the old server
  `gameState.ts`). `validateOnlineAction` takes an explicit `allowDebug`.
- `src/views.ts` — `serializeClientGameView` + view types (moved from the old
  `multiplayer-protocol/views`). Room DTOs now come from `realtime-core`.
- `src/actionSchema.ts` — `skipboActionSchema` (the `relay.move` payload) +
  `skipboGameConfigSchema` (the opaque `gameConfig`, e.g. `stockSize`).

## Invariants

- Opponent hands and hidden stock cards are redacted to `HIDDEN_CARD` — never
  ship secret card values to a non-owning seat.
- The viewer is always rendered as `players[0]` (viewer-relative rotation).

## Tests

```bash
pnpm --filter @skipbo/skipbo-runtime test
```
