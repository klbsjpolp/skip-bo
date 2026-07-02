import { describe, expect, it, vi, afterEach } from 'vitest';

import { planHandRefill, planPostPlayRefill } from '../src/lib/handRefill.js';
import { initialGameState } from '../src/state/initialGameState.js';

describe('planHandRefill', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fills empty slots from the deck in hand order', () => {
    const hand = [{ value: 1, isSkipBo: false }, null, { value: 3, isSkipBo: false }, null, null];
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
    expect(result.cards.slice(2)).toEqual(expect.arrayContaining(completedBuildPiles));
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

describe('planPostPlayRefill', () => {
  it('plans the refill for the hand as it will look after the selected hand card is played', () => {
    const state = initialGameState();
    state.players[0].hand = [{ value: 7, isSkipBo: false }, null, null, null, null];
    state.deck = [
      { value: 1, isSkipBo: false },
      { value: 2, isSkipBo: false },
      { value: 3, isSkipBo: false },
      { value: 4, isSkipBo: false },
      { value: 5, isSkipBo: false },
      { value: 6, isSkipBo: false },
    ];
    state.completedBuildPiles = [];
    state.selectedCard = { card: { value: 7, isSkipBo: false }, source: 'hand', index: 0 };

    const result = planPostPlayRefill(state);

    // All five slots refill, including the slot being vacated by the play.
    expect(result.handIndices).toEqual([0, 1, 2, 3, 4]);
    expect(result.cards).toEqual(state.deck.slice(0, 5));
  });

  it('returns an empty plan when the selection is not a hand card', () => {
    const state = initialGameState();
    state.selectedCard = { card: { value: 1, isSkipBo: false }, source: 'stock', index: 0 };

    expect(planPostPlayRefill(state)).toEqual({ cards: [], handIndices: [] });
    state.selectedCard = null;
    expect(planPostPlayRefill(state)).toEqual({ cards: [], handIndices: [] });
  });
});
