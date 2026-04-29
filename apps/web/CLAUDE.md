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

| Mode | Hook | Authority |
|------|------|-----------|
| Local | `useLocalSkipBoGame.ts` | client drives full loop |
| Online | `useOnlineSkipBoGame.ts` | server snapshots are canonical; browser never mutates state |

`useLocalSkipBoGame` is a thin re-export of `useSkipBoGame`.

`useOnlineSkipBoGame` applies **optimistic updates** for `PLAY_CARD` and `DISCARD_CARD` — the view is updated locally before the server confirms, then reconciled on the next snapshot.

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

## Theme Styling

Each theme lives in `src/themes/<name>.css` and overrides CSS variables on a `.theme-<name>` class. The base body rule in `src/index.css` applies `bg-background` (= `var(--background)`), so every theme inherits a solid background-color.

Two rules when adding decorative gradients/textures on `body` (or any element that needs to keep a solid color):

1. **Use `background-image:` — never the `background:` shorthand.** The shorthand resets `background-color` to transparent. iOS Safari samples the body's background-color when tinting its top bar; a transparent body falls back to the system default (white in light mode), which is what made Neon's status bar look wrong even though the meta `theme-color` was correct. If you need `background-attachment: fixed`, set it on its own line.

2. **Keep `--background` close to what's actually visible at the top of the page.** `useThemeColorMeta` writes `--background` into `<meta name="theme-color">`, and Tailwind's `bg-background` paints the body with the same value. A wildly off-base `--background` makes the iOS bar mismatch the page (Neon's `#0a0a0a` underneath a `#13002a → #0a0a0a` gradient is fine; Minecraft's old `#2f2418` was much darker than the dirt texture's `#866043` average — fix that, not the bar).

Multi-image gradients must be **comma-separated**. Browsers silently drop a `background-image` declaration whose layers are space-separated; `candy.css` and `retro-space.css` shipped broken halos for this reason.

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
pnpm --filter @skipbo/web exec playwright test tests/ui/theme-contract.spec.ts --project=chromium-desktop

# Update visual baselines
pnpm test:visual:update
```

Unit tests: `src/**/__tests__/`  
E2E + visual: `tests/ui/`
