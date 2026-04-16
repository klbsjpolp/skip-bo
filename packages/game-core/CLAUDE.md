# game-core

Pure game logic package shared by all apps. No UI, no network dependencies.

## Key Files

- `src/state/gameReducer.ts` — single source of game truth, built with Immer
- `src/lib/validators.ts` — card legality rules
- `src/state/initialGameState.ts` — starting state shape

## Invariants — do not break these

- Hands are fixed-length arrays; removed cards become `null`, never spliced out
- Card interactions are two-step: `SELECT_CARD` → `PLAY_CARD` or `DISCARD_CARD`
- Skip-Bo cards are wildcards and are **non-discardable**
- Start-of-turn draws happen **outside** `END_TURN`
- `players[0]`/`players[1]` are state-array order, **not** render order; in online mode the protocol layer rotates the array so the viewer is always `players[0]`
- `DEBUG_WIN` sets the winner to `currentPlayerIndex`, not a hardcoded seat — intentional

Full invariant wording: `docs/architecture/runtime-invariants.md`

## Tests

```bash
pnpm --filter @skipbo/game-core test
pnpm --filter @skipbo/game-core test -- tests/specific.test.ts
```

Tests live in `tests/`. When changing the reducer or validators, update tests here first.
If turn flow is also affected, update `apps/web/src/state/__tests__` too.
