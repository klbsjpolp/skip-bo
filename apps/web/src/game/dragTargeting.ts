/**
 * Geometry of a card drag: how far the pointer must travel before a press
 * becomes a drag, and which pile a release lands on.
 *
 * Both are parameterised by `pointerType` because a fingertip and a mouse
 * cursor are not the same instrument: a cursor is a single pixel the user aims
 * exactly, a fingertip is a ~10 mm contact patch reported as its centre. The
 * card itself always rides directly under the pointer, whichever it is — an
 * offset ghost would show the card somewhere other than where it will land,
 * and players aim at the card they can see.
 */
import type { DragTargetId } from '@/contexts/useDrag';

export interface DragPoint {
  x: number;
  y: number;
}

/** Movement that turns a press into a drag, for a cursor or a stylus. */
export const PRECISE_DRAG_THRESHOLD_PX = 5;
/**
 * The same, for a finger. Higher because a touch contact drifts by a few
 * pixels while the user is merely tapping — at 5 px a tap on a discard pile
 * regularly promoted itself into a drag that then had to be aimed.
 */
export const TOUCH_DRAG_THRESHOLD_PX = 8;

/** How far outside a pile a release still counts, for a cursor or a stylus. */
export const PRECISE_DROP_TOLERANCE_PX = 0;
/**
 * The same, for a finger. The board's piles are separated by gaps wider than
 * this, so the tolerance turns near-misses into drops without ever making two
 * piles ambiguous.
 */
export const TOUCH_DROP_TOLERANCE_PX = 28;

const isCoarse = (pointerType: string): boolean => pointerType === 'touch';

export const dragThresholdFor = (pointerType: string): number =>
  isCoarse(pointerType) ? TOUCH_DRAG_THRESHOLD_PX : PRECISE_DRAG_THRESHOLD_PX;

export const dropToleranceFor = (pointerType: string): number =>
  isCoarse(pointerType) ? TOUCH_DROP_TOLERANCE_PX : PRECISE_DROP_TOLERANCE_PX;

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** 0 when the point is inside, otherwise the shortest distance to the edge. */
export const distanceToBounds = (point: DragPoint, bounds: Bounds): number => {
  const dx = Math.max(bounds.left - point.x, 0, point.x - bounds.right);
  const dy = Math.max(bounds.top - point.y, 0, point.y - bounds.bottom);
  return Math.hypot(dx, dy);
};

const parseDropTarget = (
  element: Element,
  validBuild: ReadonlySet<number>,
  validDiscard: ReadonlySet<number>,
): DragTargetId | null => {
  const kind = element.getAttribute('data-drop-target');
  const index = Number.parseInt(element.getAttribute('data-drop-index') ?? '', 10);
  if (Number.isNaN(index)) return null;
  if (kind === 'build' && validBuild.has(index)) return { kind: 'build', index };
  if (kind === 'discard' && validDiscard.has(index)) return { kind: 'discard', index };
  return null;
};

/**
 * Which pile a drag is over.
 *
 * Deliberately rect-based rather than `document.elementFromPoint`: the piles
 * never overlap each other, so paint order buys us nothing, while rects let a
 * near-miss resolve to the closest pile — and let the whole thing be unit
 * tested without a layout engine.
 */
export const resolveDropTarget = (
  point: DragPoint,
  validBuild: ReadonlySet<number>,
  validDiscard: ReadonlySet<number>,
  tolerancePx: number,
  root: ParentNode = document,
): DragTargetId | null => {
  let nearest: { target: DragTargetId; distance: number } | null = null;

  for (const element of root.querySelectorAll<HTMLElement>('[data-drop-target][data-drop-index]')) {
    const target = parseDropTarget(element, validBuild, validDiscard);
    if (!target) continue;
    const rect = element.getBoundingClientRect();
    // A collapsed rect has no meaningful position; in jsdom every rect is
    // collapsed, which is what keeps drag unit tests from matching anything.
    if (rect.width <= 0 || rect.height <= 0) continue;
    const distance = distanceToBounds(point, rect);
    // A pile actually under the pointer always wins over any near-miss.
    if (distance === 0) return target;
    if (distance <= tolerancePx && (nearest === null || distance < nearest.distance)) {
      nearest = { target, distance };
    }
  }

  return nearest?.target ?? null;
};
