import { describe, expect, it } from 'vitest';

import { DEFAULT_STOCK_SIZE, initialGameState } from '../src/index.js';

describe('initialGameState', () => {
  it('uses a supported stock size override when provided', () => {
    const state = initialGameState({ stockSize: 35 });

    expect(state.config.STOCK_SIZE).toBe(35);
    expect(state.players[0].stockPile).toHaveLength(35);
    expect(state.players[1].stockPile).toHaveLength(35);
  });

  it('falls back to the default stock size for unsupported overrides', () => {
    const state = initialGameState({ stockSize: 7 });

    expect(state.config.STOCK_SIZE).toBe(DEFAULT_STOCK_SIZE);
    expect(state.players[0].stockPile).toHaveLength(DEFAULT_STOCK_SIZE);
    expect(state.players[1].stockPile).toHaveLength(DEFAULT_STOCK_SIZE);
  });

  it('supports creating multiplayer states with up to four players', () => {
    const state = initialGameState({ playerCount: 4, stockSize: 20 });

    expect(state.players).toHaveLength(4);
    expect(state.players[0].isAI).toBe(false);
    expect(state.players[1].isAI).toBe(true);
    expect(state.players[2].stockPile).toHaveLength(20);
    expect(state.players[3].hand).toHaveLength(5);
  });
});
