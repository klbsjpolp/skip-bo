# Runtime Invariants

## Document Contract

- Purpose: centralize the gameplay and runtime invariants that cross-cut multiple parts of the repo.
- Audience: contributors and agents changing reducer logic, turn flow, AI behavior, animations, or online state handling.
- Source of truth: the code files named in [source-of-truth.md](source-of-truth.md); this doc is the canonical narrative summary of invariants they implement.
- When to update: when an invariant changes, a new cross-cutting invariant appears, or an item moves between durable and likely-to-drift categories.

## Durable Invariants

- In local AI mode, `players[0]` is the human player and `players[1]` is the AI player.
- The UI renders the AI area first and the human area second, so DOM order does not match state order.
- Hands are fixed-length arrays. Empty slots are represented by `null`, and removing a hand card means writing `null` rather than splicing the array.
- Most card interactions are two-step: `SELECT_CARD`, then `PLAY_CARD` or `DISCARD_CARD`.
- `selectedCard` can carry `plannedBuildPileIndex` and `plannedDiscardPileIndex`, and AI flow depends on those planned targets surviving between selection and resolution.
- `Skip-Bo` cards can be played as wildcards and must never be discarded.
- Completed build piles move into `completedBuildPiles` and are reshuffled back into `deck` when more draw cards are needed.
- Start-of-turn draws belong to the local state machine draw service. `END_TURN` only flips `currentPlayerIndex`.
- Online rooms are server-authoritative. The browser treats incoming snapshots as canonical in online mode.

## Current Implementation Details

These are true today and matter operationally, but they are easier to change than the durable invariants above:

- User-visible status strings currently live in `packages/game-core/src/lib/config.ts` and are French.
- Human play and discard animations are kicked off from `apps/web/src/hooks/useSkipBoGame.ts`.
- AI play, discard, and start-of-turn draw animations are driven by `apps/web/src/services/aiAnimationService.ts` and `apps/web/src/services/drawAnimationService.ts`.
- Online opponent animations are inferred from snapshot-to-snapshot diffs in `apps/web/src/hooks/useOnlineSkipBoGame.ts`.

## Likely To Drift

Do not rely on these without checking the code:

- exact state-machine phase names and intermediate service names
- exact animation timing constants
- exact AI search depth, weights, and delays
- exact CSS selectors and container structure beyond the player-order invariant
- exact workflow filenames and secret names

## Usage Rule

When another doc needs one of these invariants, link back here instead of rephrasing it unless a short reminder is necessary for a procedural checklist.
