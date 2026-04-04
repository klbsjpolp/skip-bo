# AI Discard Strategy Notes

This file is a design note for the discard-related heuristics. The live behavior is implemented in `computeBestMove.ts`, `lookAheadStrategy.ts`, and `discardUtils.ts`.

## Implemented Today

- The AI evaluates discard choices inside a broader turn search instead of treating discard as an isolated fallback.
- Discard selection protects cards that are needed soon on build piles.
- Cards that help bridge toward the stock top are harder to discard.
- Discard-pile placement avoids hiding a good top card under a weaker one whenever possible.
- Playing from a discard pile now considers the revealed card underneath, not only the current top card.

## Practical Effect

- The AI wastes fewer `Skip-Bo`.
- It preserves more useful transition cards in hand.
- It clears discard piles more intentionally when a reveal can continue the turn.
- It keeps discard piles more organized for future turns.

## Current Gaps

- The AI still uses lightweight pressure signals for the opponent rather than a full opponent model.
- Discard roles are emergent from heuristics, not explicit named pile policies.
- There is no benchmark harness yet to compare discard quality across revisions.

## Good Next Steps

1. Add scenario tests for “burying a good reveal” and “keep a bridge card for the stock”.
2. Distinguish short-term stock-race states from slower early-game states.
3. Tune discard heuristics with recorded board snapshots instead of ad hoc manual play.
