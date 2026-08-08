import { afterEach, describe, expect, test } from 'vitest';

import {
  dragThresholdFor,
  distanceToBounds,
  dropToleranceFor,
  PRECISE_DRAG_THRESHOLD_PX,
  PRECISE_DROP_TOLERANCE_PX,
  resolveDropTarget,
  TOUCH_DRAG_THRESHOLD_PX,
  TOUCH_DROP_TOLERANCE_PX,
} from '@/game/dragTargeting';

const NO_PILES: ReadonlySet<number> = new Set();

/**
 * jsdom gives every element a zero rect, so drop targets are built by hand and
 * their rects stubbed. `resolveDropTarget` skips collapsed rects, which is what
 * keeps the component-level drag tests from matching a pile by accident.
 */
const mountDropTarget = (kind: 'build' | 'discard', index: number, bounds: DOMRect | null) => {
  const element = document.createElement('div');
  element.setAttribute('data-drop-target', kind);
  element.setAttribute('data-drop-index', String(index));
  element.getBoundingClientRect = () => bounds ?? ({ width: 0, height: 0 } as DOMRect);
  document.body.append(element);
  return element;
};

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }) as DOMRect;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('drag geometry', () => {
  test('a finger has to travel further than a cursor before a press becomes a drag', () => {
    expect(dragThresholdFor('mouse')).toBe(PRECISE_DRAG_THRESHOLD_PX);
    expect(dragThresholdFor('pen')).toBe(PRECISE_DRAG_THRESHOLD_PX);
    expect(dragThresholdFor('touch')).toBe(TOUCH_DRAG_THRESHOLD_PX);
    expect(TOUCH_DRAG_THRESHOLD_PX).toBeGreaterThan(PRECISE_DRAG_THRESHOLD_PX);
  });

  test('only touch gets a drop tolerance — a cursor lands where it is pointed', () => {
    expect(dropToleranceFor('mouse')).toBe(PRECISE_DROP_TOLERANCE_PX);
    expect(dropToleranceFor('pen')).toBe(PRECISE_DROP_TOLERANCE_PX);
    expect(dropToleranceFor('touch')).toBe(TOUCH_DROP_TOLERANCE_PX);
  });

  test('distance is zero inside the bounds and the shortest gap outside them', () => {
    const bounds = { left: 0, top: 0, right: 10, bottom: 10 };
    expect(distanceToBounds({ x: 5, y: 5 }, bounds)).toBe(0);
    expect(distanceToBounds({ x: 5, y: 14 }, bounds)).toBe(4);
    expect(distanceToBounds({ x: -3, y: 5 }, bounds)).toBe(3);
    expect(distanceToBounds({ x: 13, y: 14 }, bounds)).toBe(5);
  });
});

describe('resolveDropTarget', () => {
  test('resolves a pile the point sits inside', () => {
    mountDropTarget('build', 2, rect(100, 100, 70, 100));
    expect(resolveDropTarget({ x: 120, y: 150 }, new Set([2]), NO_PILES, 0)).toEqual({ kind: 'build', index: 2 });
  });

  test('ignores piles the dragged card cannot legally land on', () => {
    mountDropTarget('build', 2, rect(100, 100, 70, 100));
    mountDropTarget('discard', 1, rect(300, 100, 70, 100));
    expect(resolveDropTarget({ x: 120, y: 150 }, NO_PILES, NO_PILES, 0)).toBeNull();
    expect(resolveDropTarget({ x: 330, y: 150 }, NO_PILES, NO_PILES, 0)).toBeNull();
    expect(resolveDropTarget({ x: 330, y: 150 }, NO_PILES, new Set([1]), 0)).toEqual({ kind: 'discard', index: 1 });
  });

  test('a near-miss lands on the closest pile within the tolerance', () => {
    mountDropTarget('build', 0, rect(100, 100, 70, 100));
    // 12 px below the pile: a miss for a cursor, a hit for a finger.
    const justBelow = { x: 135, y: 212 };
    expect(resolveDropTarget(justBelow, new Set([0]), NO_PILES, PRECISE_DROP_TOLERANCE_PX)).toBeNull();
    expect(resolveDropTarget(justBelow, new Set([0]), NO_PILES, TOUCH_DROP_TOLERANCE_PX)).toEqual({
      kind: 'build',
      index: 0,
    });
  });

  test('a miss beyond the tolerance stays a miss', () => {
    mountDropTarget('build', 0, rect(100, 100, 70, 100));
    expect(resolveDropTarget({ x: 135, y: 400 }, new Set([0]), NO_PILES, TOUCH_DROP_TOLERANCE_PX)).toBeNull();
  });

  test('between two near-misses the closest pile wins', () => {
    mountDropTarget('build', 0, rect(0, 100, 70, 100));
    mountDropTarget('build', 1, rect(90, 100, 70, 100));
    // 15 px right of pile 0, 5 px left of pile 1.
    expect(resolveDropTarget({ x: 85, y: 150 }, new Set([0, 1]), NO_PILES, TOUCH_DROP_TOLERANCE_PX)).toEqual({
      kind: 'build',
      index: 1,
    });
  });

  test('collapsed rects are not droppable', () => {
    mountDropTarget('build', 0, null);
    expect(resolveDropTarget({ x: 0, y: 0 }, new Set([0]), NO_PILES, TOUCH_DROP_TOLERANCE_PX)).toBeNull();
  });

  test('a malformed drop index is ignored rather than resolving to NaN', () => {
    const element = mountDropTarget('build', 0, rect(0, 0, 70, 100));
    element.setAttribute('data-drop-index', 'oops');
    expect(resolveDropTarget({ x: 35, y: 50 }, new Set([0]), NO_PILES, 0)).toBeNull();
  });
});
