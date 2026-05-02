import type {CardPosition} from '@/utils/cardPositions';

/**
 * One-shot override for the *start position* of the next play/discard animation.
 *
 * The drag-and-drop flow sets this immediately before invoking
 * `playCard()` / `discardCard()` so the fly-to-target animation starts at the
 * point where the user released the pointer rather than at the card's source
 * DOM element. The hook consumes the value and clears it on read so a
 * subsequent click-flow play isn't accidentally affected.
 */
let pending: { startPosition: CardPosition } | null = null;

export const setDragCommitOverride = (override: { startPosition: CardPosition } | null) => {
  pending = override;
};

export const consumeDragCommitOverride = (): { startPosition: CardPosition } | null => {
  const value = pending;
  pending = null;
  return value;
};
