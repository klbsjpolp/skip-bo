import { useMemo } from 'react';

import type { GameAction } from '@skipbo/game-core';

/**
 * The one place that maps DebugStrip buttons to reducer actions. Both game
 * modes build their debug callbacks from here (local passes the machine's
 * dispatch, online passes sendAction), so adding a debug tool is a single
 * edit instead of one per hook.
 */
export interface DebugActions {
  debugFillBuildPile: (buildPile: number) => void;
  debugFillHandSkipBo: () => void;
  debugClearStockPile: () => void;
  debugClearAiStockPile: () => void;
  debugWin: () => void;
}

export const createDebugActions = (send: (action: GameAction) => void): DebugActions => ({
  debugFillBuildPile: (buildPile) => send({ type: 'DEBUG_FILL_BUILD_PILE', buildPile }),
  debugFillHandSkipBo: () => send({ type: 'DEBUG_FILL_HAND_SKIPBO' }),
  debugClearStockPile: () => send({ type: 'DEBUG_CLEAR_STOCK_PILE' }),
  debugClearAiStockPile: () => send({ type: 'DEBUG_CLEAR_AI_STOCK_PILE' }),
  debugWin: () => send({ type: 'DEBUG_WIN' }),
});

export function useDebugActions(send: (action: GameAction) => void): DebugActions {
  return useMemo(() => createDebugActions(send), [send]);
}
