# AI Discard Strategy Backlog

## Document Contract

- Purpose: capture backlog ideas and design hypotheses for future discard-strategy improvements.
- Audience: contributors and agents exploring future AI work rather than documenting current runtime truth.
- Source of truth: none for current runtime behavior; live behavior is implemented in `apps/web/src/ai/computeBestMove.ts`, `apps/web/src/ai/lookAheadStrategy.ts`, and `apps/web/src/ai/discardUtils.ts`.
- When to update: when AI discard-strategy hypotheses, backlog priorities, or proposed validation scenarios change.

## Current Runtime Reference

For the stable description of today's AI behavior, use [../../apps/web/src/ai/README.md](../../apps/web/src/ai/README.md). This file is intentionally non-normative.

## Problem Framing

- Discard decisions are part of a broader turn search, not an isolated fallback.
- The current AI already protects near-term build needs, bridge cards, and useful discard-pile reveals.
- Remaining gaps are mostly about opponent pressure, state-specific discard roles, and repeatable benchmarking.

## Candidate Improvements

1. Add scenario tests for "burying a good reveal" and "keep a bridge card for the stock".
2. Distinguish short-term stock-race states from slower early-game states.
3. Tune discard heuristics against recorded board snapshots instead of ad hoc manual play.
4. Explore explicit discard-pile roles if emergent heuristics stop being legible enough to tune safely.

## Suggested Validation Assets

- endgame fixtures where spending a `Skip-Bo` now may lose the next turn race
- snapshot-based benchmarks for discard quality regressions
- scenarios that reward revealing a second playable card from a discard pile
