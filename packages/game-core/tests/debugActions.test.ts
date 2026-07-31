import { describe, expect, it } from 'vitest';

import { gameReducer } from '../src/state/gameReducer.js';
import { initialGameState } from '../src/state/initialGameState.js';
import type { Card } from '../src/types/index.js';

describe('DEBUG_FILL_BUILD_PILE action', () => {
  it('prepares the first build pile for retreat animation testing', () => {
    const state = initialGameState();
    state.selectedCard = {
      card: { value: 3, isSkipBo: false },
      source: 'hand',
      index: 2,
    };

    const next = gameReducer(state, { type: 'DEBUG_FILL_BUILD_PILE', buildPile: 0 });

    expect(next.buildPiles[0]).toHaveLength(11);
    expect(next.buildPiles[0][0]).toEqual({ value: 1, isSkipBo: false });
    expect(next.buildPiles[0][10]).toEqual({ value: 11, isSkipBo: false });
    expect(next.players[0].hand[0]).toEqual({ value: 12, isSkipBo: false });
    expect(next.selectedCard).toBeNull();
    expect(next.message).toEqual({ code: 'DEBUG_BUILD_PILE_READY' });
  });
});

describe('DEBUG_SET_AI_HAND action', () => {
  it('sets the AI hand to provided values and pads to hand size', () => {
    const state = initialGameState();
    // Ensure current player is AI (index 1 per initialGameState)
    state.currentPlayerIndex = 1;
    expect(state.players[state.currentPlayerIndex].isAI).toBe(true);

    const hand: Card[] = [1, 2, 3, 4, 5].map((v) => ({ value: v, isSkipBo: false }));

    const next = gameReducer(state, { type: 'DEBUG_SET_AI_HAND', hand });

    const ai = next.players[next.currentPlayerIndex];
    expect(ai.hand.length).toBe(next.config.HAND_SIZE);
    // First 5 are the forced ones
    for (let i = 0; i < 5; i++) {
      const c = ai.hand[i];
      expect(c && c.value).toBe(i + 1);
      expect(c && c.isSkipBo).toBe(false);
    }
    // Any remaining slots should be null (if HAND_SIZE > 5 this will check)
    for (let i = 5; i < next.config.HAND_SIZE; i++) {
      expect(ai.hand[i]).toBeNull();
    }
    // Selection cleared
    expect(next.selectedCard).toBeNull();
  });
});
