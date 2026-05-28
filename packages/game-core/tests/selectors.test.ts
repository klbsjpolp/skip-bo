import { describe, expect, it } from 'vitest';

import { initialGameState } from '../src/state/initialGameState.js';
import {
  countEmptyHandSlots,
  getActivePlayer,
  getBuildPileTop,
  getNextBuildPileValue,
  getTopDiscardCard,
  getTopStockCard,
  isHandEmpty,
  isPlayerTurn,
} from '../src/selectors/index.js';

describe('selectors', () => {
  it('returns the active player', () => {
    const state = initialGameState();
    expect(getActivePlayer(state)).toBe(state.players[state.currentPlayerIndex]);
  });

  it('reports next build pile value as length + 1', () => {
    const state = initialGameState();
    expect(getNextBuildPileValue(state, 0)).toBe(1);
  });

  it('returns null for empty build pile top', () => {
    const state = initialGameState();
    expect(getBuildPileTop(state, 0)).toBeNull();
  });

  it('returns top stock card', () => {
    const state = initialGameState();
    const top = getTopStockCard(state, 0);
    expect(top).toEqual(state.players[0].stockPile.at(-1));
  });

  it('returns null when discard pile is empty', () => {
    const state = initialGameState();
    expect(getTopDiscardCard(state, 0, 0)).toBeNull();
  });

  it('detects the current player turn', () => {
    const state = initialGameState();
    expect(isPlayerTurn(state, state.currentPlayerIndex)).toBe(true);
    expect(isPlayerTurn(state, (state.currentPlayerIndex + 1) % state.players.length)).toBe(false);
  });

  it('counts empty hand slots and detects empty hands', () => {
    const state = initialGameState();
    const player = state.players[0];
    const expectedEmpty = player.hand.filter((c) => c === null).length;
    expect(countEmptyHandSlots(state, 0)).toBe(expectedEmpty);
    expect(isHandEmpty(state, 0)).toBe(player.hand.every((c) => c === null));
  });
});
