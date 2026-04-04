import { describe, expect, it, vi, afterEach } from 'vitest';
import { planHandRefill } from '@/lib/handRefill';

describe('planHandRefill', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fills empty slots from the deck in hand order', () => {
    const hand = [
      { value: 1, isSkipBo: false },
      null,
      { value: 3, isSkipBo: false },
      null,
      null,
    ];
    const deck = [
      { value: 4, isSkipBo: false },
      { value: 5, isSkipBo: false },
      { value: 6, isSkipBo: false },
    ];

    const result = planHandRefill(hand, deck, []);

    expect(result.handIndices).toEqual([1, 3, 4]);
    expect(result.cards).toEqual(deck);
  });

  it('uses completed build piles only after the deck is exhausted', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const hand = [null, null, null, null, null];
    const deck = [
      { value: 1, isSkipBo: false },
      { value: 2, isSkipBo: false },
    ];
    const completedBuildPiles = [
      { value: 9, isSkipBo: false },
      { value: 10, isSkipBo: false },
      { value: 11, isSkipBo: false },
    ];

    const result = planHandRefill(hand, deck, completedBuildPiles);

    expect(result.handIndices).toEqual([0, 1, 2, 3, 4]);
    expect(result.cards.slice(0, 2)).toEqual(deck);
    expect(result.cards.slice(2)).toHaveLength(3);
    expect(result.cards.slice(2)).toEqual(
      expect.arrayContaining(completedBuildPiles),
    );
  });

  it('returns no refill when there are no empty slots', () => {
    const hand = [
      { value: 1, isSkipBo: false },
      { value: 2, isSkipBo: false },
      { value: 3, isSkipBo: false },
      { value: 4, isSkipBo: false },
      { value: 5, isSkipBo: false },
    ];

    const result = planHandRefill(hand, [{ value: 6, isSkipBo: false }], []);

    expect(result).toEqual({ cards: [], handIndices: [] });
  });
});
