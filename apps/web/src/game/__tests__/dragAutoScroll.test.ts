import { describe, expect, test, vi } from 'vitest';

import {
  computeEdgeScrollDelta,
  createEdgeAutoScroller,
  EDGE_SCROLL_MAX_SPEED_PX,
  EDGE_SCROLL_ZONE_PX,
} from '@/game/dragAutoScroll';

const VIEWPORT = 900;

describe('computeEdgeScrollDelta', () => {
  test('holds still away from both edges', () => {
    expect(computeEdgeScrollDelta(450, VIEWPORT)).toBe(0);
    expect(computeEdgeScrollDelta(EDGE_SCROLL_ZONE_PX, VIEWPORT)).toBe(0);
    expect(computeEdgeScrollDelta(VIEWPORT - EDGE_SCROLL_ZONE_PX, VIEWPORT)).toBe(0);
  });

  test('scrolls up near the top and down near the bottom', () => {
    expect(computeEdgeScrollDelta(10, VIEWPORT)).toBeLessThan(0);
    expect(computeEdgeScrollDelta(VIEWPORT - 10, VIEWPORT)).toBeGreaterThan(0);
  });

  test('ramps with depth into the zone and caps at the edge', () => {
    const shallow = computeEdgeScrollDelta(VIEWPORT - EDGE_SCROLL_ZONE_PX + 10, VIEWPORT);
    const deep = computeEdgeScrollDelta(VIEWPORT - 5, VIEWPORT);
    expect(deep).toBeGreaterThan(shallow);
    expect(computeEdgeScrollDelta(VIEWPORT, VIEWPORT)).toBe(EDGE_SCROLL_MAX_SPEED_PX);
    // Past the edge — a finger dragged off-screen — stays capped, not faster.
    expect(computeEdgeScrollDelta(VIEWPORT + 500, VIEWPORT)).toBe(EDGE_SCROLL_MAX_SPEED_PX);
    expect(computeEdgeScrollDelta(-500, VIEWPORT)).toBe(-EDGE_SCROLL_MAX_SPEED_PX);
  });

  test('shrinks the zones on a short viewport so the middle stays still', () => {
    // 150px tall: zones clamp to 50px each, leaving a neutral band.
    expect(computeEdgeScrollDelta(75, 150)).toBe(0);
    expect(computeEdgeScrollDelta(10, 150)).toBeLessThan(0);
    expect(computeEdgeScrollDelta(145, 150)).toBeGreaterThan(0);
  });

  test('never scrolls when there is no room for a zone', () => {
    expect(computeEdgeScrollDelta(0, 0)).toBe(0);
  });
});

interface Harness {
  frames: Array<() => void>;
  scrollY: number;
  scrollable: boolean;
}

const createHarness = () => {
  const state: Harness = { frames: [], scrollY: 0, scrollable: true };
  const onScrolled = vi.fn();
  const cancelFrame = vi.fn();
  const scroller = createEdgeAutoScroller(onScrolled, {
    getViewportHeight: () => VIEWPORT,
    getScrollY: () => state.scrollY,
    scrollBy: (delta) => {
      if (state.scrollable) state.scrollY += delta;
    },
    requestFrame: (callback) => {
      state.frames.push(callback);
      return state.frames.length;
    },
    cancelFrame,
  });
  const runFrame = () => state.frames.shift()?.();
  return { state, onScrolled, cancelFrame, scroller, runFrame };
};

describe('createEdgeAutoScroller', () => {
  test('does not schedule a frame while the pointer is away from the edges', () => {
    const { state, scroller } = createHarness();
    scroller.update(450);
    expect(state.frames).toHaveLength(0);
  });

  test('scrolls the board and reports it while the pointer sits at an edge', () => {
    const { state, onScrolled, scroller, runFrame } = createHarness();
    scroller.update(VIEWPORT - 2);
    expect(state.frames).toHaveLength(1);

    runFrame();
    expect(state.scrollY).toBe(EDGE_SCROLL_MAX_SPEED_PX);
    // The board moved under a stationary finger, so the caller has to
    // re-resolve which pile is now under it.
    expect(onScrolled).toHaveBeenCalledTimes(1);
    // …and it keeps going without any further pointer movement.
    expect(state.frames).toHaveLength(1);

    runFrame();
    expect(state.scrollY).toBe(EDGE_SCROLL_MAX_SPEED_PX * 2);
  });

  test('stops at the end of the document instead of re-rendering every frame', () => {
    const { state, onScrolled, scroller, runFrame } = createHarness();
    state.scrollable = false;
    scroller.update(VIEWPORT - 2);
    runFrame();

    expect(onScrolled).not.toHaveBeenCalled();
    expect(state.frames).toHaveLength(0);

    // A later pointermove restarts the loop — the page may be scrollable again.
    state.scrollable = true;
    scroller.update(VIEWPORT - 2);
    expect(state.frames).toHaveLength(1);
  });

  test('a frame that finds the pointer back in the middle ends the loop', () => {
    const { state, onScrolled, scroller, runFrame } = createHarness();
    scroller.update(VIEWPORT - 2);
    scroller.update(450);
    runFrame();

    expect(state.scrollY).toBe(0);
    expect(onScrolled).not.toHaveBeenCalled();
    expect(state.frames).toHaveLength(0);
  });

  test('stop cancels a pending frame and freezes the board', () => {
    const { state, cancelFrame, scroller, runFrame } = createHarness();
    scroller.update(VIEWPORT - 2);
    scroller.stop();

    expect(cancelFrame).toHaveBeenCalledTimes(1);
    runFrame();
    expect(state.scrollY).toBe(0);
  });
});
