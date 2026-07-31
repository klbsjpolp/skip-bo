import { createContext, useContext } from 'react';

export interface BoardKeyboardContextValue {
  /** Discard pile awaiting a Space confirmation, or `null`. */
  armedDiscardPile: number | null;
}

// A no-op default keeps the hook usable in fixtures and unit tests that render a
// board without the provider. Like drag, the keyboard layer is additive — with
// no provider there is simply nothing armed, and every consumer renders as it
// did before the feature existed.
const NOOP_BOARD_KEYBOARD_CONTEXT: BoardKeyboardContextValue = {
  armedDiscardPile: null,
};

export const BoardKeyboardContext = createContext<BoardKeyboardContextValue>(NOOP_BOARD_KEYBOARD_CONTEXT);

export const useBoardKeyboard = (): BoardKeyboardContextValue => useContext(BoardKeyboardContext);

/** True when this discard pile is the one waiting on a Space confirmation. */
export const useIsDiscardPileArmed = (pileIndex: number, playerIndex: number): boolean => {
  const { armedDiscardPile } = useBoardKeyboard();
  // The keyboard only ever drives the local seat, which both boards re-centre
  // to index 0 — an opponent's pile at the same index must not light up.
  return playerIndex === 0 && armedDiscardPile === pileIndex;
};
