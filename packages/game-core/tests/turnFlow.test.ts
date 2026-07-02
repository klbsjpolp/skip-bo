import { describe, expect, it } from 'vitest';

import { planStartOfTurnDraw } from '../src/lib/turnFlow.js';
import { initialGameState } from '../src/state/initialGameState.js';

describe('planStartOfTurnDraw', () => {
  it('plans a DRAW that refills the active player’s empty slots', () => {
    const state = initialGameState();
    state.currentPlayerIndex = 1;
    state.deck = [
      { value: 4, isSkipBo: false },
      { value: 5, isSkipBo: false },
      { value: 6, isSkipBo: false },
    ];
    state.completedBuildPiles = [];
    state.players[1].hand = [{ value: 1, isSkipBo: false }, null, null, { value: 2, isSkipBo: false }, null];

    const { action, plan } = planStartOfTurnDraw(state);

    expect(action).toEqual({ type: 'DRAW', count: 3 });
    expect(plan.handIndices).toEqual([1, 2, 4]);
    expect(plan.cards).toEqual(state.deck);
  });

  it('plans a zero-card draw when the hand is already full', () => {
    const state = initialGameState();
    state.players[0].hand = Array.from({ length: state.config.HAND_SIZE }, (_, i) => ({
      value: i + 1,
      isSkipBo: false,
    }));

    const { action, plan } = planStartOfTurnDraw(state);

    expect(action).toEqual({ type: 'DRAW', count: 0 });
    expect(plan).toEqual({ cards: [], handIndices: [] });
  });
});
