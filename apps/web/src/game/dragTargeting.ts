/**
 * Geometry of a card drag: how far the pointer must travel before a press
 * becomes a drag, where the ghost sits relative to the pointer, and which pile
 * a release lands on.
 *
 * All of it is parameterised by `pointerType` because a fingertip and a mouse
 * cursor are not the same instrument. A cursor is a single pixel the user can
 * see; a fingertip is a ~10 mm contact patch whose reported centre is hidden
 * under the finger itself. Everything below exists to close that gap.
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

/**
 * Fraction of a card's height the ghost floats above a fingertip. Without a
 * lift the dragged card is entirely hidden under the hand holding it, which is
 * most of why touch drags "fail": the player cannot see what they are carrying
 * or where it is about to land.
 */
const TOUCH_GHOST_LIFT_RATIO = 0.6;

/** Used when `--card-height` cannot be read (jsdom, very early paint). */
export const FALLBACK_CARD_HEIGHT_PX = 66;

const isCoarse = (pointerType: string): boolean => pointerType === 'touch';

export const dragThresholdFor = (pointerType: string): number =>
  isCoarse(pointerType) ? TOUCH_DRAG_THRESHOLD_PX : PRECISE_DRAG_THRESHOLD_PX;

export const dropToleranceFor = (pointerType: string): number =>
  isCoarse(pointerType) ? TOUCH_DROP_TOLERANCE_PX : PRECISE_DROP_TOLERANCE_PX;

export const ghostLiftFor = (pointerType: string, cardHeightPx: number): number =>
  isCoarse(pointerType) ? Math.round(cardHeightPx * TOUCH_GHOST_LIFT_RATIO) : 0;

/** Live `--card-height`, so the lift tracks the responsive card size. */
export const readCardHeightPx = (): number => {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return FALLBACK_CARD_HEIGHT_PX;
  }
  const raw = window.getComputedStyle(document.documentElement).getPropertyValue('--card-height');
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_CARD_HEIGHT_PX;
};

/**
 * The points a release is tested against, most-intentional first.
 *
 * With the ghost lifted, a player can aim two ways and both read as correct:
 * put the *card* on the pile, or put the *finger* on the pile. Probing both
 * means neither aim misses. The lifted point comes first so that when the two
 * land on different valid piles, the drop matches the card the player can
 * actually see — which is also the pile lit up as `is-drag-over`.
 */
export const dragProbePoints = (x: number, y: number, ghostLiftPx: number): DragPoint[] =>
  ghostLiftPx > 0
    ? [
        { x, y: y - ghostLiftPx },
        { x, y },
      ]
    : [{ x, y }];

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
  points: readonly DragPoint[],
  validBuild: ReadonlySet<number>,
  validDiscard: ReadonlySet<number>,
  tolerancePx: number,
  root: ParentNode = document,
): DragTargetId | null => {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('[data-drop-target][data-drop-index]'));
  let nearest: { target: DragTargetId; distance: number } | null = null;

  for (const point of points) {
    for (const element of candidates) {
      const target = parseDropTarget(element, validBuild, validDiscard);
      if (!target) continue;
      const rect = element.getBoundingClientRect();
      // A collapsed rect has no meaningful position; in jsdom every rect is
      // collapsed, which is what keeps drag unit tests from matching anything.
      if (rect.width <= 0 || rect.height <= 0) continue;
      const distance = distanceToBounds(point, rect);
      // A pile actually under the point always wins over any near-miss, and
      // the earlier probe point wins over the later one.
      if (distance === 0) return target;
      if (distance <= tolerancePx && (nearest === null || distance < nearest.distance)) {
        nearest = { target, distance };
      }
    }
  }

  return nearest?.target ?? null;
};
