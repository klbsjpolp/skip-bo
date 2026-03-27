# Skip-Bo AI Module

This directory contains the AI move-selection logic used by the XState game loop.

## Files

- `computeBestMove.ts`: public AI entry point used by the bot service
- `lookAheadStrategy.ts`: turn search that simulates short play sequences through the reducer
- `discardUtils.ts`: discard and discard-pile heuristics
- `strategyUtils.ts`: shared helpers for stock pressure, build-pile needs, and card visibility
- `aiConfig.ts`: single advanced AI profile and artificial delays
- `discardStrategy.md`: design notes and backlog for future AI improvements

## Runtime Flow

1. `gameMachine.ts` invokes `computeBestMove` during the AI turn.
2. `computeBestMove` first resolves any already selected card.
3. If that card was selected by the AI, the planned build pile or discard pile is preserved on `SelectedCard`.
4. If no card is selected, the AI runs the search in `lookAheadStrategy.ts`.
5. The search simulates real reducer transitions, so it compares move sequences using the same rules as gameplay.

The AI still acts in two machine ticks when needed:

- one tick to select a card
- one tick to resolve that selection into a play or discard

What changed is that the destination is now retained, so the second tick no longer loses the intent chosen by the first one.

## Core Strategy

- Strong stock-first bias: reducing the stock pile dominates the evaluation.
- Skip-Bo conservation: the AI avoids spending a wildcard when a natural card can do the same job.
- Short sequence search: the AI prefers moves that reveal or enable follow-up plays, especially toward the stock top.
- Smarter discard usage: it avoids burying a useful discard top under a weaker card.
- Better discard-pile play: it values what gets revealed underneath, not just the current top card.

## Heuristics In Use

`discardUtils.ts` currently scores moves with heuristics such as:

- grouping same-value cards in discard piles
- keeping near-stock bridge cards out of discard when possible
- preserving values needed soon on build piles
- preferring higher-value cards as discard candidates
- penalizing moves that hide a currently playable discard top
- rewarding discard-pile plays that reveal another playable or stock-relevant card

## Important Constraints

- Skip-Bo cards are never discarded.
- Hands are fixed-length arrays with `null` holes.
- `players[1]` is the AI player in the current app.
- AI animations are triggered outside this directory by the state machine and services layer.
- There is no longer a difficulty setting; the app always uses the strongest available AI profile.

## Current Limits

- The search is still local to the AI turn; it does not model the opponent reply as a minimax tree.
- Opponent awareness is limited to pressure signals such as stock-pile size.
- The search depth is intentionally short to keep bot turns fast in the browser.

## Next Improvements

- Add scenario fixtures for endgames where using a Skip-Bo now may lose a later race.
- Extend evaluation with stronger opponent denial heuristics.
- Build a benchmark set of representative board states to compare AI revisions.
