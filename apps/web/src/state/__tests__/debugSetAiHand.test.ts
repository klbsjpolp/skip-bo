import { describe, it, expect } from 'vitest';
import { initialGameState } from '@/state/initialGameState';
import { gameReducer } from '@/state/gameReducer';
import type { Card } from '@/types';

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
