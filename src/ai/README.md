# Skip-Bo AI Module

This directory contains the AI move-selection logic used by the XState game loop.

## Files

- `computeBestMove.ts`: public AI entry point used by the bot service
- `discardUtils.ts`: heuristic helpers for discard selection and discard-pile play
- `aiConfig.ts`: difficulty levels, feature flags, and artificial delays
- `lookAheadStrategy.ts`: extra scored move evaluation used in hard mode
- `discardStrategy.md`: design notes and backlog for future AI improvements

## Runtime Flow

1. `gameMachine.ts` invokes `computeBestMove` during the AI turn.
2. `computeBestMove` synchronizes `GameState.aiDifficulty` into `aiConfig`.
3. If a card is already selected, the AI tries to resolve that selection by playing or discarding it.
4. If no card is selected, the AI optionally runs the extra move-evaluation pass from `lookAheadStrategy.ts`.
5. If that does not produce a move, the fallback priority is:
   - play from stock
   - play from hand
   - play from discard piles
   - select a hand card to discard
   - end turn

The AI generally works in two steps: it selects a card first, then the next machine cycle resolves that selection into a play or discard action.

## Difficulty Levels

### Easy

- Strategic discard-pile selection enabled
- Strategic card-to-discard selection disabled
- Strategic play from discard piles disabled
- Extra move evaluation disabled

### Medium

- Strategic discard-pile selection enabled
- Strategic card-to-discard selection enabled
- Strategic play from discard piles enabled
- Extra move evaluation disabled

### Hard

- Strategic discard-pile selection enabled
- Strategic card-to-discard selection enabled
- Strategic play from discard piles enabled
- Extra move evaluation enabled

## What The AI Actually Evaluates

`discardUtils.ts` currently scores moves with heuristics such as:

- grouping same-value cards in discard piles
- extending simple sequences in discard piles
- preserving values needed soon on build piles
- preferring higher-value cards for discard in some contexts
- preferring larger discard piles when a discard-pile play is available
- increasing caution when opponents are close to winning

## Important Constraints

- Skip-Bo cards are never discarded.
- Hands are fixed-length arrays with `null` holes.
- `players[1]` is the AI player in the current app.
- AI animations are triggered outside this directory by the state machine and services layer.

## Important Limitation

`lookAheadStrategy.ts` is named as if it performs recursive look-ahead, but the current implementation is a one-ply scored evaluator. The exported `simulateMove` helper is not yet used to build a deeper search.

## Next Improvements

- Use `simulateMove` to implement genuine multi-step search for hard mode.
- Add explicit endgame heuristics based on stock-pile pressure.
- Introduce tests for difficulty-specific behavior, not just generic AI turns.
- Consider surfacing the difficulty switcher in the UI once the UX is ready.
