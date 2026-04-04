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
});
