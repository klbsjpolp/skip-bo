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

The server (the shared relay in [realtime-infra](https://github.com/klbsjpolp/realtime-infra))
is a **game-agnostic relay** — it never sees game
state. The **host** seat (seat 0) runs `@skipbo/skipbo-runtime` (`SkipboHost`),
applies every move (its own and relayed guest moves), and pushes a **redacted
`ClientGameView` per seat** plus the abstract turn / a reconnection snapshot /
the end-game signal. Guests send intents (`relay { kind: 'move' }`) and render
the views the host relays.

Both roles share **one** rendering path: `ingestView(view)` — the host generates
the view locally, a guest receives it over the wire. `useOnlineSkipBoGame` still
applies **optimistic updates** for `PLAY_CARD`/`DISCARD_CARD`, reconciled when the
next authoritative view arrives. The host echoes exactly one view per relayed
move; when several guest moves are in flight (select→play within one round-trip,
e.g. a drag), `ingestRelayedView` skips the earlier, stale echoes — rendering
them would revert the optimistic play and fake a deck→hand draw animation — and
renders only the final one. Lobby data comes from `presence` (there is no game
view during `WAITING`).

**Placeholder gotcha:** `useOnlineSkipBoGame` returns a seat-capacity placeholder
`gameState` (`createPlaceholderGameState` — 4 seats, no `displayName`, `isAI` by
index) until the first real `view` is ingested, while `roomStatus` may already be
`ACTIVE`/`FINISHED` via presence. Any consumer reading `gameState.players` (stats,
summaries) must gate on the returned `hasGameView` flag, not on `roomStatus` alone.

### Testing multiplayer without the real backend

`tests/mock-relay/mockRelayServer.ts` is an in-process, protocol-v2-faithful fake
of the relay server (HTTP room create/join + WebSocket lobby/relay; it validates
inbound messages with `@klbsjpolp/realtime-core`'s zod schemas and never inspects
payloads). Deterministic on purpose: sequential room codes, and `startGame` keeps
seat order unless `shuffleSeats: true` — so tests know the host plays first.

- **Automated:** `tests/ui/online-multiplayer.spec.ts` starts the mock relay and
  drives two browser contexts (host + guest) through lobby → moves in both
  directions → redaction check → end of game.
  `pnpm --filter @skipbo/web exec playwright test tests/ui/online-multiplayer.spec.ts --project=chromium-desktop`
- **Manual:** `pnpm --filter @skipbo/web mock:relay` (port 8787, honours
  `MOCK_RELAY_PORT`), then `VITE_SKIPBO_API_URL=http://127.0.0.1:8787 pnpm dev`
  and open two tabs.

## Pile Presses

`resolvePileIntent` (`src/game/pileIntents.ts`) is the **single** statement of what
pressing a pile does, whatever pressed it. Click, Enter/Space on a focused pile and
the keyboard shortcut layer all translate their own event into a `PilePressTarget`,
call it, and perform the returned `BoardIntent` via `applyBoardIntent`. Three rules
live there and nowhere else:

1. A discard pile is a **discard target** while a hand card is selected, and a
   **card source** otherwise.
2. Pressing the source that is already selected deselects it.
3. An empty slot is inert **as a source** (an empty pile is still a valid discard
   target).

It never returns a play — that is what keeps the "selection first, then play or
discard" invariant true for every input method. The drag path shares rule 1 through
`canDiscardFromSource`.

Do not re-derive any of this in a component. These rules used to be restated per
input method, and the copies drifted.

## Drag And Drop (pointer + touch)

`useDraggableCard` binds `onPointerDown` on every draggable card; `DragProvider`
holds the live session and `DragGhost` renders the floating card. Drops are
resolved by `src/game/dragTargeting.ts` and edge scrolling by
`src/game/dragAutoScroll.ts` — both pure enough to unit test, which is where new
behavior belongs.

A drag never commits a move by itself: crossing the threshold calls `selectCard`,
and the release calls `playCard` / `discardCard`. That is deliberate — a drag
released in mid-air leaves the card selected, so the move finishes with one tap.
It is also what keeps drag inside the "selection first, then play or discard"
invariant.

**Touch is not a small mouse.** These four exist only because of it, and each one
fixed a real iPad failure — do not "simplify" them away:

1. **The gesture is taken from the page.** `touch-action: none` on
   `[data-drag-source]` is advisory on iOS: Safari re-decides a few frames in and
   can hand the gesture back to the scroller, killing the drag with a
   `pointercancel`. The hook therefore also cancels `touchmove` (non-passive) for
   the whole gesture, from the first move, before the threshold is crossed —
   once WebKit has begun a scroll, the moves stop being cancelable.
2. **The page must not be scrollable when the board fits.** The safe-area padding
   sits on `#root`, _outside_ `main`, so a `min-h-svh` on `main` makes every iOS
   document taller than its viewport. Height comes from the `#main` rule in
   `styles/layout.css`, which subtracts the insets; `overscroll-behavior: none`
   kills the rubber band. Putting a `min-h-*` utility back on `main` reintroduces
   the stray scroll a drag turns into.
3. **A near-miss still lands**, within `TOUCH_DROP_TOLERANCE_PX` of the pile,
   because a fingertip is a contact patch and the piles sit further apart than
   the tolerance. Drop resolution is rect-based rather than `elementFromPoint` —
   the piles never overlap, so paint order buys nothing and rects are what allow
   a tolerance at all.

   **The card rides directly under the pointer, with no offset.** Floating it
   above the fingertip so the hand doesn't cover it was tried and reverted: the
   card then shows somewhere other than where it will land, and players aim at
   the card they see, so they start targeting below the pile. If you reintroduce
   a lift to make the card visible, the drop point has to move with it.

4. **Holding a card at a viewport edge scrolls the board** (`dragAutoScroll`).
   Since (1) means the page cannot be panned by hand mid-drag, this is the only
   way to reach a pile that is off-screen when the board doesn't fit.

Only one card is in the air at a time — a module-level pointer-id guard in
`useDraggableCard`. iPadOS delivers a `pointerdown` for a second finger, and two
concurrent drags fight over the same `selectedCard`.

## Keyboard Layer (desktop)

`BoardKeyboardProvider` (`src/contexts/BoardKeyboardContext.tsx`) mounts a global
keydown listener over a board. The bindings are **positional** — the digit row
drives the construction piles, the top letter row the local seat's own zone,
mirroring the on-screen layout:

```
        2   3   4   5           construction piles 1-4
    q   w e r t y   u i o p     talon | main 1-5 | défausses 1-4
```

- All mapping and legality lives in the pure `resolveKeyboardIntent`
  (`src/game/keyboardActions.ts`); the provider is a thin listener. Add bindings
  there, not in the hook.
- **What a pile press means is not decided there.** `resolveKeyboardIntent` maps a
  key onto a pile and defers to `resolvePileIntent` — see [Pile Presses](#pile-presses)
  below. Its only departure is turning a returned `discard` into `armDiscard`.
- Bind on `event.code`, never `event.key` — the layout is positional, and `code`
  preserves the finger pattern on AZERTY. `?` is the one exception (no stable
  code across layouts). Badge labels come from `navigator.keyboard.getLayoutMap()`
  where it exists, so an AZERTY player is shown their own legends.
- Build plays commit immediately; **discards arm and wait for Space**, since they
  are irreversible and end the turn.
- Mounted **per screen** (`LocalGameScreen`, `OnlineGameScreen`), never inside the
  board: `GameBoard` is also rendered by `OnlineGameBoard` and as an inert lobby
  placeholder with stub callbacks. Online it is gated on `hasGameView`, not
  `roomStatus` (see the placeholder gotcha above).
- It needs a `CardAnimationProvider` above it (it reads the animation queue to
  know when the board has settled). Fixtures mount no provider at all.

### Hint badges

`.key-hint-badge` is **always mounted and transparent**, absolutely positioned so
it takes no layout — that is what keeps the committed visual baselines valid.
Visibility is a `body[data-key-hints]` attribute, the same trick `DragProvider`
uses for drop targets. Two reveals: one unprompted per session (sessionStorage,
`pointer: fine` only, on the first settled local turn), and an on-demand one from
any key press or a held Alt.

**Trap:** pile containers are targeted by structural CSS (`:only-child`,
`:nth-last-child(… of …)`). Adding any child to `.discard-pile-stack` or
`.build-pile` can silently retarget those rules — the badges broke Metro's
discard collapse until the selectors were scoped to `.card` explicitly. Run
`test:visual` after touching pile children.

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

Theme registry (order, label, `NEW`/`UPDATED` badge) is the `themes` array in [`packages/game-core/src/types/index.ts`](../../packages/game-core/src/types/index.ts); the default theme is `defaultTheme` in [`src/Root.tsx`](src/Root.tsx). Keep the `ThemeStatus` type on the array — removing the last `UPDATED`/`NEW` use narrows the inferred union and breaks `ThemeSwitcher`'s `=== 'UPDATED'` comparison (TS2367).

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

- Visual assertions go through `expectScreenshotIfBaselineExists` (not `toHaveScreenshot` directly), which
  **silently skips** when no baseline is committed — a new visual test passes vacuously until you run `test:visual:update`.
- `playwright test --list` gives the real count (186 instances vs 56 `test()` calls); specs loop over themes × 2 projects.
- CI runs the `ui` job on **macOS**; baselines are committed as `*-darwin.png`, so regenerate snapshots locally on macOS to match.
- Editing the `themes` array (order / label / `NEW`/`UPDATED` badge) or the default theme also changes `layout-and-accessibility.spec.ts`'s `theme-switcher-open` snapshot — regenerate it too, not just `theme-contract`/`readability`.

Unit tests: `src/**/__tests__/`  
E2E + visual: `tests/ui/`

## Coverage

`codecov/patch` is a **required** check — new/changed lines need test coverage.
Component-inline expressions are awkward to render-test; extract non-trivial logic
into an exported pure helper (e.g. `shouldRecordOnlineStats`) and unit-test that.
