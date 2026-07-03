import { describe, expect, it, vi } from 'vitest';

import { getMaxDrawAnimationDuration, scheduleDrawAnimations } from '@/hooks/useOnlineSkipBoGame/helpers';

const transition = { cards: [{ value: 1, isSkipBo: false }], handIndices: [0], playerIndex: 1 };

describe('scheduleDrawAnimations', () => {
  it('fires one animateDraws per transition with the base delay', () => {
    const driver = { animateDraws: vi.fn(async () => 0) };

    scheduleDrawAnimations(driver, [transition], 250);

    expect(driver.animateDraws).toHaveBeenCalledWith(1, transition.cards, [0], 500, 250);
  });

  it('warns instead of throwing when a draw animation rejects', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const driver = { animateDraws: vi.fn(() => Promise.reject(new Error('boom'))) };

    scheduleDrawAnimations(driver, [transition]);
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith('Draw animation failed during online transition:', expect.any(Error));
    });
  });
});

describe('getMaxDrawAnimationDuration', () => {
  it('returns the max duration across transitions', () => {
    const driver = { calculateDrawsDuration: vi.fn((playerIndex: number) => (playerIndex === 1 ? 800 : 300)) };

    const max = getMaxDrawAnimationDuration(driver, [transition, { ...transition, playerIndex: 0 }], 100);

    expect(max).toBe(800);
    expect(driver.calculateDrawsDuration).toHaveBeenCalledWith(1, [0], 500, 100);
  });
});
