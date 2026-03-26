# AGENTS.md

Repo-local guidance for AI and coding agents working on this project.

## Fast Commands

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm dev`

## Source of Truth

- Game rules and state transitions live in [`src/state/gameReducer.ts`](/Users/pierreluc/Development/skip-bo/src/state/gameReducer.ts).
- Turn orchestration lives in [`src/state/gameMachine.ts`](/Users/pierreluc/Development/skip-bo/src/state/gameMachine.ts).
- Card validity rules live in [`src/lib/validators.ts`](/Users/pierreluc/Development/skip-bo/src/lib/validators.ts).
- AI move selection lives in [`src/ai/computeBestMove.ts`](/Users/pierreluc/Development/skip-bo/src/ai/computeBestMove.ts) and helpers in [`src/ai/discardUtils.ts`](/Users/pierreluc/Development/skip-bo/src/ai/discardUtils.ts).

## Important Invariants

- `players[0]` is human and `players[1]` is AI.
- The UI renders AI first, then the human player. Animation code translates from state index to DOM index.
- Hands are fixed-length arrays. Empty slots are represented by `null`.
- Most AI and UI card interactions are two-step: `SELECT_CARD`, then `PLAY_CARD` or `DISCARD_CARD`.
- Skip-Bo cards must never be discarded.
- A completed build pile is moved to `completedBuildPiles` and later reshuffled into the deck.
- `GameState.aiDifficulty` is the runtime source of truth for AI difficulty. `computeBestMove` syncs that value into `aiConfig` before scoring moves.

## AI Notes

- `easy` uses simpler discard behavior.
- `medium` enables strategic discard-card and discard-pile choices.
- `hard` enables the extra move-evaluation pass in [`src/ai/lookAheadStrategy.ts`](/Users/pierreluc/Development/skip-bo/src/ai/lookAheadStrategy.ts).
- Despite the filename, `lookAheadStrategy.ts` is currently a one-ply evaluator, not a recursive full-turn search.
- [`src/ai/discardStrategy.md`](/Users/pierreluc/Development/skip-bo/src/ai/discardStrategy.md) should be treated as design notes and backlog, not as the source of truth for current behavior.

## Testing Guidance

- Reducer and state-machine changes should usually update tests under [`src/state/__tests__`](/Users/pierreluc/Development/skip-bo/src/state/__tests__).
- Card rendering and interaction changes should usually update tests under [`src/components/__tests__`](/Users/pierreluc/Development/skip-bo/src/components/__tests__).
- If you touch animation timing or DOM assumptions, validate both human and AI turns in the browser.

## Useful Debug Hook

- `?aiHand=` can force the AI hand in the draw service for local debugging. Supported formats include `1,2,3,4,5`, `1-2-3-4-5`, and `[1,2,3,4,5]`.

## Documentation Maintenance

- Keep [`README.md`](/Users/pierreluc/Development/skip-bo/README.md), [`src/ai/README.md`](/Users/pierreluc/Development/skip-bo/src/ai/README.md), and [`AGENTS.md`](/Users/pierreluc/Development/skip-bo/AGENTS.md) aligned when architecture changes.
- Avoid listing dependencies or features in the README unless they are actually used by gameplay or the app shell.
