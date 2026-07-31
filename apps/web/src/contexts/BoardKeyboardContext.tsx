import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';

import type { GameState, MoveResult } from '@skipbo/game-core';

import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog';
import { BoardKeyboardContext, type BoardKeyboardContextValue } from '@/contexts/useBoardKeyboard';
import { useCardAnimation } from '@/contexts/useCardAnimation.ts';
import { DRAG_ACTIVE_ATTRIBUTE } from '@/contexts/useDrag';
import {
  BOUND_CODES,
  FALLBACK_KEY_LABELS,
  LOCAL_PLAYER_INDEX,
  resolveKeyboardIntent,
  shouldIgnoreKeyEvent,
  type KeyEventEnvironment,
} from '@/game/keyboardActions';
import {
  ACTIVITY_REVEAL_MS,
  AUTO_REVEAL_DELAY_MS,
  AUTO_REVEAL_MS,
  hasKeyboardPointer,
  hasSeenKeyHintsThisSession,
  markKeyHintsSeenThisSession,
  resolveKeyLabels,
  shouldAutoRevealKeyHints,
} from '@/game/keyHints';

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
  const { activeAnimations } = useCardAnimation();

  // Two independent reveals: `isAltHeld` while the recall gesture is down, and
  // `isTimedVisible` for the auto-reveal and the post-key idle window. Keeping
  // them apart means releasing Alt can't cut short a reveal a key press earned.
  const [isAltHeld, setIsAltHeld] = useState(false);
  const [isTimedVisible, setIsTimedVisible] = useState(false);
  const [keyLabels, setKeyLabels] = useState<Record<string, string>>(FALLBACK_KEY_LABELS);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const revealTemporarily = useCallback((durationMs: number) => {
    setIsTimedVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setIsTimedVisible(false), durationMs);
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const selectedCard = gameState.selectedCard;
  const isLocalTurn = gameState.currentPlayerIndex === LOCAL_PLAYER_INDEX && !gameState.gameIsOver;
  const armedDiscardPile =
    armed && isLocalTurn && selectedCard?.source === 'hand' && selectedCard.index === armed.handIndex
      ? armed.pile
      : null;

  // The listener reads the live board through a ref rather than closing over it,
  // so a rebind isn't needed on every state change — and, more importantly, so a
  // key pressed mid-move can never act on a stale board.
  const current = { gameState, armedDiscardPile, selectCard, playCard, discardCard, clearSelection };
  const latest = useRef(current);

  useEffect(() => {
    latest.current = current;
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
        // Read from the attribute DragProvider already publishes rather than
        // subscribing to the drag context: the session object changes on every
        // pointermove, which would re-render this provider ~60 times a second
        // for a boolean that flips twice per drag.
        isDragActive: document.body.hasAttribute(DRAG_ACTIVE_ATTRIBUTE),
        hasArmedDiscard: current.armedDiscardPile !== null,
      };

      // Alt is the hold-to-recall gesture, so it never reaches the board.
      if (event.key === 'Alt') {
        setIsAltHeld(true);
        return;
      }

      if (shouldIgnoreKeyEvent(event, environment)) {
        return;
      }

      // Any key that survives the guards — bound or not — means the player is
      // reaching for the keyboard, so show them what the keys do. Someone
      // pressing a key that does nothing is precisely who needs the badges.
      revealTemporarily(ACTIVITY_REVEAL_MS);

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
          setIsHelpOpen(true);
          break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        setIsAltHeld(false);
      }
    };

    // Alt-Tabbing away never delivers the keyup, which would strand the badges
    // on until the next Alt press.
    const onBlur = () => setIsAltHeld(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled, revealTemporarily]);

  // The one unprompted reveal, on the first turn the player can actually act on.
  // The "already seen" flag is mirrored into state and only set once the reveal
  // has actually started: deriving it straight from sessionStorage would flip
  // `canAutoReveal` to false the moment the flag was written, and the effect
  // cleanup would cancel the very timer that was about to show the badges.
  const [hasSeenHints, setHasSeenHints] = useState(hasSeenKeyHintsThisSession);
  // Lazy initialiser: the pointer kind cannot change for the life of the page,
  // and matchMedia allocates a live MediaQueryList on every call.
  const [isKeyboardPointer] = useState(hasKeyboardPointer);
  const canAutoReveal = shouldAutoRevealKeyHints({
    isEnabled: enabled,
    hasSeenThisSession: hasSeenHints,
    hasKeyboardPointer: isKeyboardPointer,
    isLocalTurn,
    isAnimating: activeAnimations.length > 0,
  });

  useEffect(() => {
    if (!canAutoReveal) {
      return undefined;
    }

    // Marking inside the timer means an attempt cancelled by a late animation
    // doesn't burn the session's one unprompted reveal.
    const timer = setTimeout(() => {
      markKeyHintsSeenThisSession();
      setHasSeenHints(true);
      revealTemporarily(AUTO_REVEAL_MS);
    }, AUTO_REVEAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [canAutoReveal, revealTemporarily]);

  useEffect(() => {
    let cancelled = false;

    void resolveKeyLabels().then((labels) => {
      if (!cancelled) {
        setKeyLabels(labels);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const areKeyHintsVisible = enabled && (isAltHeld || isTimedVisible);

  // Drive visibility from a body attribute rather than per-badge props, the same
  // way DragProvider lights up drop targets: one CSS toggle instead of a
  // re-render of every pile on the board.
  useEffect(() => {
    if (!areKeyHintsVisible) {
      return undefined;
    }

    document.body.setAttribute('data-key-hints', 'visible');
    return () => document.body.removeAttribute('data-key-hints');
  }, [areKeyHintsVisible]);

  const value = useMemo<BoardKeyboardContextValue>(
    () => ({ armedDiscardPile, keyLabels }),
    [armedDiscardPile, keyLabels],
  );

  return (
    <BoardKeyboardContext.Provider value={value}>
      {children}
      <KeyboardShortcutsDialog keyLabels={keyLabels} onOpenChange={setIsHelpOpen} open={isHelpOpen} />
    </BoardKeyboardContext.Provider>
  );
};
