import { describe, expect, it } from 'vitest';

import { applyOnlineAction, createOnlineInitialGameState } from '../src/gameLogic.js';

describe('applyOnlineAction', () => {
  it('performs the start-of-turn draw when a discard advances the turn', () => {
    const state = createOnlineInitialGameState({ playerCount: 2 });
    state.players[0].hand = [{ value: 3, isSkipBo: false }, null, null, null, null];
    state.players[1].hand = [{ value: 7, isSkipBo: false }, null, null, null, null];
    state.selectedCard = { card: { value: 3, isSkipBo: false }, source: 'hand', index: 0 };

    const selected = applyOnlineAction(state, { type: 'SELECT_CARD', source: 'hand', index: 0 });
    const next = applyOnlineAction(selected, { type: 'DISCARD_CARD', discardPile: 0 });

    expect(next.currentPlayerIndex).toBe(1);
    // The turn advanced, so the new current player's hand was refilled by the
    // shared planStartOfTurnDraw rule.
    expect(next.players[1].hand.every((card) => card !== null)).toBe(true);
  });

  it('does not draw when the action leaves the turn unchanged', () => {
    const state = createOnlineInitialGameState({ playerCount: 2 });
    state.players[0].hand = [{ value: 1, isSkipBo: false }, null, null, null, null];
    state.buildPiles = [[], [], [], []];

    const selected = applyOnlineAction(state, { type: 'SELECT_CARD', source: 'hand', index: 0 });
    const played = applyOnlineAction(selected, { type: 'PLAY_CARD', buildPile: 0 });

    expect(played.currentPlayerIndex).toBe(0);
    expect(played.buildPiles[0]).toHaveLength(1);
  });
});
