import { describe, expect, it } from 'vitest';
import { findBestDiscardPile } from '@/ai/discardUtils';
import { initialGameState } from '@/state/initialGameState';

describe('findBestDiscardPile', () => {
  it('préfère ouvrir une nouvelle pile plutôt que d’empiler sur une pile sans rapport', () => {
    const state = initialGameState();

    state.currentPlayerIndex = 1;
    state.buildPiles = [[], [], [], []];
    state.players[1] = {
      ...state.players[1],
      isAI: true,
      stockPile: [{ value: 9, isSkipBo: false }],
      discardPiles: [[{ value: 12, isSkipBo: false }], [], [], []],
    };

    const discardPileIndex = findBestDiscardPile(
      { value: 3, isSkipBo: false },
      state.players[1].discardPiles,
      state
    );

    expect(discardPileIndex).toBe(1);
  });

  it('garde le regroupement quand une pile correspond déjà bien à la carte', () => {
    const state = initialGameState();

    state.currentPlayerIndex = 1;
    state.buildPiles = [[], [], [], []];
    state.players[1] = {
      ...state.players[1],
      isAI: true,
      stockPile: [{ value: 10, isSkipBo: false }],
      discardPiles: [[{ value: 8, isSkipBo: false }], [], [], []],
    };

    const discardPileIndex = findBestDiscardPile(
      { value: 8, isSkipBo: false },
      state.players[1].discardPiles,
      state
    );

    expect(discardPileIndex).toBe(0);
  });
});
