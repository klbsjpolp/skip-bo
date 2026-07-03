import { describe, expect, it, vi } from 'vitest';

import { initialGameState } from '@skipbo/game-core';

import { createAnimationDriver, noopAnimationDriver, type AnimationPrimitives } from '@/services/animationDriver';

vi.mock('@/services/aiAnimationService', () => ({ triggerAIAnimation: vi.fn(() => 11) }));
vi.mock('@/services/drawAnimationService', () => ({
  calculateMultipleDrawAnimationDuration: vi.fn(() => 22),
  triggerMultipleDrawAnimations: vi.fn(async () => 33),
}));
vi.mock('@/services/completedBuildPileAnimationService', () => ({
  triggerCompletedBuildPileAnimation: vi.fn(() => 44),
}));

import { triggerAIAnimation } from '@/services/aiAnimationService';
import { calculateMultipleDrawAnimationDuration, triggerMultipleDrawAnimations } from '@/services/drawAnimationService';
import { triggerCompletedBuildPileAnimation } from '@/services/completedBuildPileAnimationService';

const primitives: AnimationPrimitives = {
  startAnimation: vi.fn(() => 'id'),
  removeAnimation: vi.fn(),
  waitForAnimations: vi.fn(async () => undefined),
};

describe('createAnimationDriver', () => {
  it('delegates every animation to its service with the primitives attached', async () => {
    const driver = createAnimationDriver(primitives);
    const state = initialGameState();
    const cards = [{ value: 1, isSkipBo: false }];

    expect(driver.animateMove(state, { type: 'PLAY_CARD', buildPile: 0 })).toBe(11);
    expect(triggerAIAnimation).toHaveBeenCalledWith(primitives, state, { type: 'PLAY_CARD', buildPile: 0 }, undefined);

    await expect(driver.animateDraws(0, cards, [0], 500, 100)).resolves.toBe(33);
    expect(triggerMultipleDrawAnimations).toHaveBeenCalledWith(primitives, 0, cards, [0], 500, 100);

    expect(driver.calculateDrawsDuration(0, [0])).toBe(22);
    expect(calculateMultipleDrawAnimationDuration).toHaveBeenCalledWith(0, [0]);

    expect(driver.animateCompletion(state, 0, cards, 2, 100, 50)).toBe(44);
    expect(triggerCompletedBuildPileAnimation).toHaveBeenCalledWith(primitives, state, 0, cards, 2, 100, 50);

    expect(driver.startAnimation).toBe(primitives.startAnimation);
  });
});

describe('noopAnimationDriver', () => {
  it('animates nothing and reports zero durations', async () => {
    const state = initialGameState();
    expect(noopAnimationDriver.startAnimation({} as never)).toBe('');
    expect(noopAnimationDriver.removeAnimation('x')).toBeUndefined();
    await expect(noopAnimationDriver.waitForAnimations()).resolves.toBeUndefined();
    expect(noopAnimationDriver.animateMove(state, { type: 'END_TURN' })).toBe(0);
    await expect(noopAnimationDriver.animateDraws(0, [], [])).resolves.toBe(0);
    expect(noopAnimationDriver.calculateDrawsDuration(0, [])).toBe(0);
    expect(noopAnimationDriver.animateCompletion(state, 0, [], 0)).toBe(0);
  });
});
