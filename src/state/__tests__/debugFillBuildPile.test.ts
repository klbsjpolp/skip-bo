import { describe, expect, it } from 'vitest';
import { gameReducer } from '@/state/gameReducer';
import { initialGameState } from '@/state/initialGameState';

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
    expect(next.message).toBe('Pile de construction prête (debug)');
  });
});
