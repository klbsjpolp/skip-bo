# AI Discard Strategy Notes

This file is a design note for the discard-related heuristics. It is not the source of truth for current behavior; see `computeBestMove.ts`, `discardUtils.ts`, and `aiConfig.ts` for the live implementation.

## Implemented Today

- Strategic discard-pile selection with scoring for:
  - same-value grouping
  - sequential values
  - empty-pile preference
  - high-value preservation
- Strategic hand-card selection for discarding, including:
  - duplicate detection
  - penalties for values needed on build piles
  - scarcity awareness
  - opponent-pressure adjustments
- Strategic play from discard piles, including:
  - preference for larger piles
  - bonus for completing a build pile
  - bonus for clearing low cards
- Difficulty-gated behavior through `aiConfig.ts`

## Current Gaps

- The so-called look-ahead mode is still a one-ply evaluation pass, not a recursive search.
- Opponent modeling is limited to broad pressure signals such as stock-pile size.
- There is no telemetry or benchmark suite to compare heuristic quality across versions.
- Difficulty-specific behavior is under-documented in automated tests.

## Good Next Steps

1. Use `simulateMove` to convert hard mode into a real multi-step search.
2. Add dedicated tests that assert different choices for `easy`, `medium`, and `hard`.
3. Add scenario fixtures for endgame states, duplicate-heavy hands, and discard-pile traps.
4. Separate "safe discard" heuristics from "setup future discard-pile play" heuristics so they can be tuned independently.
