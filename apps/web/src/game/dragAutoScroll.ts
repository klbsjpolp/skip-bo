/**
 * Edge auto-scroll for card drags.
 *
 * A drag owns the touch gesture end to end, so the page cannot be scrolled by
 * hand while a card is in the air. On a viewport that shows the whole board
 * that is exactly what we want. When the board *doesn't* fit — a phone, or an
 * iPad in portrait with a tall theme — it would otherwise make the off-screen
 * piles unreachable by drag at all. Holding the card near the top or bottom
 * edge scrolls the board under it instead.
 */

/** Distance from a viewport edge at which the board starts moving. */
export const EDGE_SCROLL_ZONE_PX = 88;
/** Scroll speed, in CSS pixels per frame, at the very edge of the viewport. */
export const EDGE_SCROLL_MAX_SPEED_PX = 22;

/**
 * Pixels to scroll this frame: negative up, positive down, 0 outside the edge
 * zones. Ramps linearly with how deep into the zone the pointer is, so easing
 * a card toward the edge creeps and pinning it there moves at full speed.
 */
export const computeEdgeScrollDelta = (
  pointerY: number,
  viewportHeight: number,
  zonePx: number = EDGE_SCROLL_ZONE_PX,
  maxSpeedPx: number = EDGE_SCROLL_MAX_SPEED_PX,
): number => {
  // On a short viewport the two zones would overlap and the board would never
  // hold still; a third of the height each is the most that stays usable.
  const zone = Math.min(zonePx, Math.floor(viewportHeight / 3));
  if (zone <= 0) return 0;

  const topDepth = zone - pointerY;
  if (topDepth > 0) return -Math.ceil((Math.min(topDepth, zone) / zone) * maxSpeedPx);

  const bottomDepth = pointerY - (viewportHeight - zone);
  if (bottomDepth > 0) return Math.ceil((Math.min(bottomDepth, zone) / zone) * maxSpeedPx);

  return 0;
};

export interface EdgeAutoScrollerDeps {
  getViewportHeight: () => number;
  getScrollY: () => number;
  scrollBy: (deltaY: number) => void;
  requestFrame: (callback: () => void) => number;
  cancelFrame: (handle: number) => void;
}

export interface EdgeAutoScroller {
  /** Feed the latest pointer position; starts or keeps the loop running. */
  update: (pointerY: number) => void;
  stop: () => void;
}

const defaultDeps = (): EdgeAutoScrollerDeps => ({
  getViewportHeight: () => window.innerHeight,
  getScrollY: () => window.scrollY,
  scrollBy: (deltaY) => window.scrollBy(0, deltaY),
  requestFrame: (callback) => window.requestAnimationFrame(callback),
  cancelFrame: (handle) => window.cancelAnimationFrame(handle),
});

/**
 * `onScrolled` fires after each frame that actually moved the page, so the
 * caller can re-resolve which pile now sits under a stationary pointer.
 */
export const createEdgeAutoScroller = (
  onScrolled: () => void,
  overrides: Partial<EdgeAutoScrollerDeps> = {},
): EdgeAutoScroller => {
  const deps = { ...defaultDeps(), ...overrides };
  let pointerY: number | null = null;
  let frame: number | null = null;

  const step = () => {
    frame = null;
    if (pointerY === null) return;
    const delta = computeEdgeScrollDelta(pointerY, deps.getViewportHeight());
    if (delta === 0) return;

    const before = deps.getScrollY();
    deps.scrollBy(delta);
    // Already at the top or bottom of the document: stop rather than burn a
    // frame per tick re-rendering an unchanged board. A later `update` — the
    // next pointermove — restarts the loop.
    if (deps.getScrollY() === before) return;

    onScrolled();
    frame = deps.requestFrame(step);
  };

  return {
    update: (nextPointerY: number) => {
      pointerY = nextPointerY;
      if (frame !== null) return;
      if (computeEdgeScrollDelta(nextPointerY, deps.getViewportHeight()) === 0) return;
      frame = deps.requestFrame(step);
    },
    stop: () => {
      pointerY = null;
      if (frame !== null) {
        deps.cancelFrame(frame);
        frame = null;
      }
    },
  };
};
