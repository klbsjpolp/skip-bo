import { describe, expect, it, vi } from 'vitest';

import type { GameAction } from '@skipbo/game-core';

import { createDebugActions } from '@/game/debugActions';

describe('createDebugActions', () => {
  it('maps every debug callback to its reducer action through the given sender', () => {
    const send = vi.fn<(action: GameAction) => void>();
    const actions = createDebugActions(send);

    actions.debugFillBuildPile(2);
    actions.debugFillHandSkipBo();
    actions.debugClearStockPile();
    actions.debugClearAiStockPile();
    actions.debugWin();

    expect(send.mock.calls.map(([action]) => action)).toEqual([
      { type: 'DEBUG_FILL_BUILD_PILE', buildPile: 2 },
      { type: 'DEBUG_FILL_HAND_SKIPBO' },
      { type: 'DEBUG_CLEAR_STOCK_PILE' },
      { type: 'DEBUG_CLEAR_AI_STOCK_PILE' },
      { type: 'DEBUG_WIN' },
    ]);
  });
});
