# Skip-Bo AI Module

## Document Contract

- Purpose: orient contributors inside the AI module and summarize the stable runtime behavior implemented here.
- Audience: contributors and agents changing AI move selection, search, heuristics, or AI-facing delays.
- Source of truth: `computeBestMove.ts`, `lookAheadStrategy.ts`, `discardUtils.ts`, and `aiConfig.ts`.
- When to update: when AI module boundaries, runtime flow, or documented constraints change.

## Files

- `computeBestMove.ts`: public AI entry point used by the game loop
- `lookAheadStrategy.ts`: short turn search simulated through the reducer
- `discardUtils.ts`: discard and discard-pile heuristics
- `strategyUtils.ts`: shared helpers for stock pressure, build-pile needs, and card visibility
- `aiConfig.ts`: single advanced AI profile and artificial delays

## Runtime Flow

1. `gameMachine.ts` invokes `computeBestMove` during the AI turn.
2. `computeBestMove` first resolves an already selected card.
3. Planned build-pile or discard-pile targets are preserved on `selectedCard` so the second step can resolve the intended move.
4. If no card is selected, `lookAheadStrategy.ts` evaluates the next selection.
5. The search simulates real reducer transitions, so it uses the same rule engine as gameplay.

## Stable Constraints

- The AI still acts in two machine ticks when selection and resolution are separate.
- `Skip-Bo` cards are never discarded.
- Hands are fixed-length arrays with `null` holes.
- The app ships one advanced AI profile and no difficulty selector.
- AI animations are orchestrated outside this directory by the state machine and animation services.

## Current Limits

- The search models the AI's own turn, not a full minimax opponent tree.
- Opponent awareness is limited to pressure signals such as stock-pile size.
- Search depth is intentionally short enough to stay responsive in the browser.

## Related Docs

- [../../../../docs/architecture/source-of-truth.md](../../../../docs/architecture/source-of-truth.md)
- [../../../../docs/architecture/runtime-invariants.md](../../../../docs/architecture/runtime-invariants.md)
- [../../../../docs/backlog/ai-discard-strategy.md](../../../../docs/backlog/ai-discard-strategy.md)
