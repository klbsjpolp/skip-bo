# web app

React/Vite PWA. XState v5 drives the turn loop; game state is owned by `game-core`.

## Turn Flow (XState machine)

`src/state/gameMachine.ts`

```
setup → humanTurn → botTurn → finished
         ↳ drawing → selectingCard → waiting
                       botTurn: computing → playing → discarding
```

## Animation Gating

`src/services/animationGate.ts` serializes all effects.
All AI animation, draw animation, and pile-completion effects pass through this gate.
Animation services live in `src/services/`.

## Local vs. Online Mode

| Mode   | Hook                     | Authority                                                              |
| ------ | ------------------------ | ---------------------------------------------------------------------- |
| Local  | `useLocalSkipBoGame.ts`  | client drives full loop                                                |
| Online | `useOnlineSkipBoGame.ts` | **host-authoritative**: the host seat runs the game; the server relays |

`useLocalSkipBoGame` is a thin re-export of `useSkipBoGame`.

### Online (host-authoritative)

The server (`apps/realtime-api`) is a **game-agnostic relay** — it never sees game
state. The **host** seat (seat 0) runs `@skipbo/skipbo-runtime` (`SkipboHost`),
applies every move (its own and relayed guest moves), and pushes a **redacted
`ClientGameView` per seat** plus the abstract turn / a reconnection snapshot /
the end-game signal. Guests send intents (`relay { kind: 'move' }`) and render
the views the host relays.

Both roles share **one** rendering path: `ingestView(view)` — the host generates
the view locally, a guest receives it over the wire. `useOnlineSkipBoGame` still
applies **optimistic updates** for `PLAY_CARD`/`DISCARD_CARD`, reconciled when the
next authoritative view arrives. Lobby data comes from `presence` (there is no
game view during `WAITING`).

## AI

Entry point: `src/ai/computeBestMove.ts`  
Strategy: short lookahead via `lookAheadStrategy.ts` — intentionally no minimax (browser responsiveness).  
**Read `src/ai/README.md` before changing AI logic.**

When AI logic changes: update `src/ai/__tests__` and `src/ai/README.md`.

## UI Fixtures

`src/testing/uiFixtures.ts` exports named game-state snapshots. Load one via query param:

```
http://localhost:5173/?fixture=<name>
```

This bypasses the game loop entirely — useful for isolated layout/visual work without playing to a specific state.

Cards render as `<div class="card normal-card" data-value="N">` for N=1–12 and `<div class="card skip-bo skipbo-text">` for Skip-Bo. Use `.card.normal-card[data-value="N"]` selectors for per-value theme styling (see `metro.css`, `rainbow.css`).

## Theme Styling

Full guide: [`src/themes/README.md`](src/themes/README.md). It covers the file map (`src/styles/*.css` + `src/themes/*.css`), Tailwind 4 conventions, the token catalog, and the theme template.

Two rules that get violated most often — keep them in your head:

1. **Use `background-image:` — never the `background:` shorthand on body or anywhere that needs a stable `background-color`.** The shorthand resets `background-color` to transparent; iOS Safari samples that color for the status bar tint.
2. **Multi-layer gradients must be comma-separated**, and `background-size` / `background-repeat` lists must have the same number of entries as the layers (CSS silently cycles shorter lists).

Themes also have a **readability contract** — filled card values and the turn-state prompt must meet ≥ 3:1 contrast, the selected card must visibly differ from unselected ones, and the Skip-Bo wildcard must keep its accessible name. Enforced by [`tests/ui/readability.spec.ts`](tests/ui/readability.spec.ts); see [`src/themes/README.md`](src/themes/README.md#11-readability-contract) §11 for the full rules. `.card.empty-card` (the `Vide` placeholder) is intentionally exempt — it should recede.

## Debug Buttons

`DebugStrip` renders in `DEV` mode only, in both local and online game screens:

- **Fill build pile** — fills build pile 0 to one card before completion
- **Win** — ends the game immediately for the current player

## Tests

```bash
# All web unit tests
pnpm --filter @skipbo/web test

# Single file
pnpm --filter @skipbo/web test -- src/path/to/test.test.ts

# E2E (run after any visible board behavior change)
pnpm --filter @skipbo/web test:e2e
pnpm --filter @skipbo/web test:e2e -- --grep "test name"

# Visual contract (run when fixture-visible layout changes)
# Always run BOTH projects — CI fails if mobile baselines drift.
pnpm --filter @skipbo/web test:visual

# Update visual baselines (covers chromium-desktop + chromium-mobile,
# uses --update-snapshots=all because Playwright ≥1.59 defaults the
# bare flag to "missing" and silently skips existing baselines).
pnpm test:visual:update
```

Unit tests: `src/**/__tests__/`  
E2E + visual: `tests/ui/`
