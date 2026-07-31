import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';

import type { GameState, MoveResult } from '@skipbo/game-core';

import { BoardKeyboardContext, type BoardKeyboardContextValue } from '@/contexts/useBoardKeyboard';
import { useDrag } from '@/contexts/useDrag';
import {
  BOUND_CODES,
  resolveKeyboardIntent,
  shouldIgnoreKeyEvent,
  type KeyEventEnvironment,
} from '@/game/keyboardActions';

export interface BoardKeyboardProviderProps {
  children: ReactNode;
  /** False while no game is in play (the online lobby, a fixture render). */
  enabled?: boolean;
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  playCard: (buildPileIndex: number) => Promise<MoveResult>;
  discardCard: (discardPileIndex: number) => Promise<MoveResult>;
  clearSelection: () => void;
}

const OVERLAY_SELECTOR =
  '[role="dialog"][data-state="open"], [role="listbox"][data-state="open"], [role="menu"][data-state="open"]';

// A key pressed with nothing focused targets `window` or `document`, neither of
// which is an Element — narrow before asking either one about tags or roles.
const asElement = (target: EventTarget | null): Element | null => (target instanceof Element ? target : null);

const isTextEntryElement = (element: Element | null): boolean => {
  if (!element) {
    return false;
  }

  const tagName = element.tagName;

  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    (element as HTMLElement).isContentEditable === true
  );
};

const isActivatableElement = (element: Element | null): boolean =>
  !!element && (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button');

/**
 * Mounts the desktop keyboard layer over a board and publishes the armed-discard
 * state to the piles that need to render it.
 *
 * Mounted once per screen rather than inside the board: `GameBoard` is rendered
 * by `LocalGameBoard`, by `OnlineGameBoard` in the two-player case, and again as
 * an inert placeholder during the online lobby — binding from in there would
 * double-register or attach to stub callbacks.
 */
export const BoardKeyboardProvider: FC<BoardKeyboardProviderProps> = ({
  children,
  enabled = true,
  gameState,
  selectCard,
  playCard,
  discardCard,
  clearSelection,
}) => {
  // The arm remembers which hand card it was made for. That turns "is this arm
  // still valid?" into a derived question rather than an effect that races the
  // render — the player may click another card with the mouse, have the
  // selection consumed, or end the turn, and a stale highlight would invite a
  // Space that discards something else entirely.
  const [armed, setArmed] = useState<{ pile: number; handIndex: number } | null>(null);
  const { session: dragSession } = useDrag();

  const selectedCard = gameState.selectedCard;
  const isLocalTurn = gameState.currentPlayerIndex === 0 && !gameState.gameIsOver;
  const armedDiscardPile =
    armed && isLocalTurn && selectedCard?.source === 'hand' && selectedCard.index === armed.handIndex
      ? armed.pile
      : null;

  // The listener reads the live board through a ref rather than closing over it,
  // so a rebind isn't needed on every state change — and, more importantly, so a
  // key pressed mid-move can never act on a stale board.
  const latest = useRef({
    gameState,
    armedDiscardPile,
    isDragActive: dragSession !== null,
    selectCard,
    playCard,
    discardCard,
    clearSelection,
  });

  useEffect(() => {
    latest.current = {
      gameState,
      armedDiscardPile,
      isDragActive: dragSession !== null,
      selectCard,
      playCard,
      discardCard,
      clearSelection,
    };
  });

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const current = latest.current;
      const target = asElement(event.target);
      const environment: KeyEventEnvironment = {
        isTextEntry: isTextEntryElement(target),
        isActivatable: isActivatableElement(target),
        hasOpenOverlay: document.querySelector(OVERLAY_SELECTOR) !== null,
        isDragActive: current.isDragActive,
        hasArmedDiscard: current.armedDiscardPile !== null,
      };

      if (shouldIgnoreKeyEvent(event, environment)) {
        return;
      }

      // Claim every bound code up front, whether or not it resolves to a legal
      // move. Otherwise Space scrolls the board away when there is nothing armed
      // to confirm, which is exactly when a player is most likely to press it.
      if (BOUND_CODES.has(event.code)) {
        event.preventDefault();
      }

      const intent = resolveKeyboardIntent(event, current.gameState, current.armedDiscardPile);

      if (!intent) {
        return;
      }

      switch (intent.kind) {
        case 'select':
          setArmed(null);
          current.selectCard(intent.source, intent.index, intent.discardPileIndex);
          break;
        case 'clearSelection':
          setArmed(null);
          current.clearSelection();
          break;
        case 'play':
          setArmed(null);
          void current.playCard(intent.buildPile);
          break;
        case 'armDiscard': {
          // Pinning the hand index is what lets the arm be invalidated by
          // derivation when the selection moves on.
          const handIndex = current.gameState.selectedCard?.index;
          setArmed(handIndex === undefined ? null : { pile: intent.discardPile, handIndex });
          break;
        }
        case 'confirmDiscard':
          setArmed(null);
          void current.discardCard(intent.discardPile);
          break;
        case 'disarm':
          setArmed(null);
          break;
        case 'help':
          // Wired to the cheat sheet in a later change.
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);

  const value = useMemo<BoardKeyboardContextValue>(() => ({ armedDiscardPile }), [armedDiscardPile]);

  return <BoardKeyboardContext.Provider value={value}>{children}</BoardKeyboardContext.Provider>;
};
