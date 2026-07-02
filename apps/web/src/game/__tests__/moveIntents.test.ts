import { describe, expect, it } from 'vitest';

import { initialGameState, type Card, type GameState } from '@skipbo/game-core';

import { prepareDiscardCardIntent, preparePlayCardIntent } from '@/game/moveIntents';

const card = (value: number, isSkipBo = false): Card => ({ value, isSkipBo });

const stateWithSelection = (source: 'hand' | 'stock' | 'discard', cardValue: number): GameState => {
  const state = initialGameState();
  state.currentPlayerIndex = 0;
  state.buildPiles = [[], [], [], []];
  state.players[0].hand = [card(cardValue), card(9), null, null, null];
  state.selectedCard = { card: card(cardValue), source, index: 0 };
  return state;
};

describe('preparePlayCardIntent', () => {
  it('rejects when no card is selected', () => {
    const state = initialGameState();
    state.selectedCard = null;

    expect(preparePlayCardIntent(state, 0)).toEqual({ valid: false, error: 'Aucune carte sélectionnée' });
  });

  it('rejects an illegal play with the shared error string', () => {
    const state = stateWithSelection('hand', 5);

    expect(preparePlayCardIntent(state, 0)).toEqual({
      valid: false,
      error: 'Vous ne pouvez pas jouer cette carte',
    });
  });

  it('accepts a legal play and reports no refill for a non-emptying hand', () => {
    const state = stateWithSelection('hand', 1);

    const intent = preparePlayCardIntent(state, 0);

    expect(intent.valid).toBe(true);
    if (intent.valid) {
      expect(intent.selectedCard).toBe(state.selectedCard);
      expect(intent.willEmptyHand).toBe(false);
      expect(intent.refillPlan).toEqual({ cards: [], handIndices: [] });
      expect(intent.completedBuildPileCards).toBeNull();
    }
  });

  it('plans the refill when the play empties the hand', () => {
    const state = stateWithSelection('hand', 1);
    state.players[0].hand = [card(1), null, null, null, null];
    state.deck = [card(2), card(3)];
    state.completedBuildPiles = [];

    const intent = preparePlayCardIntent(state, 0);

    expect(intent.valid).toBe(true);
    if (intent.valid) {
      expect(intent.willEmptyHand).toBe(true);
      expect(intent.refillPlan.cards).toEqual([card(2), card(3)]);
      expect(intent.refillPlan.handIndices).toEqual([0, 1]);
    }
  });

  it('reports the retreating cards when the play completes the build pile', () => {
    const state = stateWithSelection('hand', 12);
    state.buildPiles[0] = Array.from({ length: 11 }, (_, index) => card(index + 1));

    const intent = preparePlayCardIntent(state, 0);

    expect(intent.valid).toBe(true);
    if (intent.valid) {
      expect(intent.completedBuildPileCards).toHaveLength(12);
      expect(intent.completedBuildPileCards?.at(-1)).toEqual(card(12));
    }
  });
});

describe('prepareDiscardCardIntent', () => {
  it('rejects when no card is selected', () => {
    const state = initialGameState();
    state.selectedCard = null;

    expect(prepareDiscardCardIntent(state)).toEqual({ valid: false, error: 'Aucune carte sélectionnée' });
  });

  it('rejects discarding from stock or discard piles', () => {
    const state = stateWithSelection('stock', 4);

    expect(prepareDiscardCardIntent(state)).toEqual({
      valid: false,
      error: 'Vous devez défausser une carte de votre main',
    });
  });

  it('accepts a hand discard and returns the validated selection', () => {
    const state = stateWithSelection('hand', 4);

    expect(prepareDiscardCardIntent(state)).toEqual({ valid: true, selectedCard: state.selectedCard });
  });
});
