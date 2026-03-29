# AGENTS.md

Repo-local guidance for AI and coding agents working on this project.

## Fast Commands

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm test:e2e:ui`
- `pnpm test:visual`
- `pnpm test:visual:update`

## Source of Truth

- Core game rules and state mutations live in [`src/state/gameReducer.ts`](/Users/pierreluc/Development/skip-bo/src/state/gameReducer.ts).
- Turn orchestration, start-of-turn draws, AI turns, and animation gating live in [`src/state/gameMachine.ts`](/Users/pierreluc/Development/skip-bo/src/state/gameMachine.ts).
- Initial deck setup and stock-size configuration live in [`src/state/initialGameState.ts`](/Users/pierreluc/Development/skip-bo/src/state/initialGameState.ts).
- Card legality rules live in [`src/lib/validators.ts`](/Users/pierreluc/Development/skip-bo/src/lib/validators.ts).
- Human-side interaction orchestration and human-triggered animations live in [`src/hooks/useSkipBoGame.ts`](/Users/pierreluc/Development/skip-bo/src/hooks/useSkipBoGame.ts).
- AI move selection starts in [`src/ai/computeBestMove.ts`](/Users/pierreluc/Development/skip-bo/src/ai/computeBestMove.ts), with search in [`src/ai/lookAheadStrategy.ts`](/Users/pierreluc/Development/skip-bo/src/ai/lookAheadStrategy.ts), discard heuristics in [`src/ai/discardUtils.ts`](/Users/pierreluc/Development/skip-bo/src/ai/discardUtils.ts), and weights/delays in [`src/ai/aiConfig.ts`](/Users/pierreluc/Development/skip-bo/src/ai/aiConfig.ts).
- Dev-only static browser fixtures live in [`src/testing/uiFixtures.ts`](/Users/pierreluc/Development/skip-bo/src/testing/uiFixtures.ts) and are wired in [`src/App.tsx`](/Users/pierreluc/Development/skip-bo/src/App.tsx).

## Runtime Invariants

- `players[0]` is the human player and `players[1]` is the AI player.
- The UI renders the AI area first and the human area second. DOM order does not match state order, so animation code must translate between player index and rendered position.
- Hands are fixed-length arrays. Empty slots are represented by `null`, and removing a hand card should set the slot to `null` instead of splicing the array.
- Most card interactions are two-step: `SELECT_CARD`, then `PLAY_CARD` or `DISCARD_CARD`.
- `selectedCard` can carry `plannedBuildPileIndex` and `plannedDiscardPileIndex`. The AI depends on those planned targets surviving between selection and resolution.
- Skip-Bo cards can be played as wildcards but must never be discarded.
- Completed build piles are moved into `completedBuildPiles` and reshuffled back into `deck` when more draw cards are needed.
- Start-of-turn draws are owned by the state machine `drawService`. `END_TURN` only flips `currentPlayerIndex`; do not add draw logic there.
- User-visible status strings live in [`src/lib/config.ts`](/Users/pierreluc/Development/skip-bo/src/lib/config.ts) and are currently French.

## Turn And Animation Model

- The state machine drives turn flow through draw, animate, think, and resolve phases for both players.
- Human play and discard animations are kicked off from [`src/hooks/useSkipBoGame.ts`](/Users/pierreluc/Development/skip-bo/src/hooks/useSkipBoGame.ts) before dispatching the final action.
- AI play, discard, and start-of-turn draw animations are triggered from [`src/services/aiAnimationService.ts`](/Users/pierreluc/Development/skip-bo/src/services/aiAnimationService.ts) and [`src/services/drawAnimationService.ts`](/Users/pierreluc/Development/skip-bo/src/services/drawAnimationService.ts).
- [`src/services/animationGate.ts`](/Users/pierreluc/Development/skip-bo/src/services/animationGate.ts) waits for both the minimum duration and the shared animation bridge, so timing changes can affect state progression as well as visuals.
- If you touch animation timing, DOM structure, or `.player-area` / `.center-area` assumptions, validate both human and AI turns in a real browser.

## AI Notes

- There is no user-facing difficulty setting anymore. The app always uses the single advanced AI profile from [`src/ai/aiConfig.ts`](/Users/pierreluc/Development/skip-bo/src/ai/aiConfig.ts).
- `computeBestMove` first resolves an already selected card, using any planned destination stored on `selectedCard`.
- If nothing is selected, `computeBestMove` runs `lookAheadEvaluation` to choose the next selection.
- Despite the filename, [`src/ai/lookAheadStrategy.ts`](/Users/pierreluc/Development/skip-bo/src/ai/lookAheadStrategy.ts) is not just a one-ply scorer. It performs a short recursive search across the AI's own turn, with a default depth of 4 from `aiConfig`.
- The search simulates real reducer transitions via `gameReducer`, so rule changes often require corresponding AI test updates.
- [`src/ai/discardUtils.ts`](/Users/pierreluc/Development/skip-bo/src/ai/discardUtils.ts) scores both discard placement and discard-pile plays, including the value of the card revealed underneath.
- [`src/ai/discardStrategy.md`](/Users/pierreluc/Development/skip-bo/src/ai/discardStrategy.md) is design/backlog material, not runtime source of truth.

## Testing Guidance

- Reducer and state-machine changes should usually update tests under [`src/state/__tests__`](/Users/pierreluc/Development/skip-bo/src/state/__tests__).
- AI heuristic or search changes should usually update tests under [`src/ai/__tests__`](/Users/pierreluc/Development/skip-bo/src/ai/__tests__).
- Card rendering and interaction changes should usually update tests under [`src/components/__tests__`](/Users/pierreluc/Development/skip-bo/src/components/__tests__).
- Theme, layout, and accessibility regressions should usually update Playwright coverage under [`tests/ui`](/Users/pierreluc/Development/skip-bo/tests/ui).
- [`tests/ui/helpers.ts`](/Users/pierreluc/Development/skip-bo/tests/ui/helpers.ts) is the shared entrypoint for fixture navigation, theme seeding, overflow checks, and conditional screenshot assertions.
- Desktop visual baselines are Chromium snapshots stored under `tests/ui/*.spec.ts-snapshots/` and typically committed through Git LFS.
- Playwright projects collect tests by `@desktop` and `@mobile` tags so desktop-only cases are not materialized as skips on the mobile project.
- Screenshot assertions intentionally return early when the baseline file is missing, so functional checks can still run on branches without snapshot payloads.

## Useful Debug Hooks

- `?aiHand=` can force the AI hand in the live draw service for local debugging. Supported formats include `1,2,3,4,5`, `1-2-3-4-5`, and `[1,2,3,4,5]`.
- `?fixture=` enables deterministic UI fixtures in development only. Supported values are `ready-human`, `selected-hand`, `ai-turn`, and `victory-human`.
- Fixture mode swaps the app into a static shell in [`src/App.tsx`](/Users/pierreluc/Development/skip-bo/src/App.tsx), so it is appropriate for UI review and Playwright, not for reducer or state-machine debugging.
- Stock pile size is persisted in local storage under `skipbo_stock_size`. [`src/components/StockPileSizeSwitcher.tsx`](/Users/pierreluc/Development/skip-bo/src/components/StockPileSizeSwitcher.tsx) updates it, and new games read it through [`src/state/initialGameState.ts`](/Users/pierreluc/Development/skip-bo/src/state/initialGameState.ts).

## Documentation Maintenance

- Keep [`README.md`](/Users/pierreluc/Development/skip-bo/README.md), [`src/ai/README.md`](/Users/pierreluc/Development/skip-bo/src/ai/README.md), and [`AGENTS.md`](/Users/pierreluc/Development/skip-bo/AGENTS.md) aligned when architecture changes.
- When gameplay rules change, update the source-of-truth code first, then update docs and tests together.
- Avoid documenting removed features as if they still exist. In particular, do not reintroduce difficulty-mode language unless the runtime feature returns.
- Avoid listing dependencies or features in the README unless they are actually used by gameplay or the app shell.
