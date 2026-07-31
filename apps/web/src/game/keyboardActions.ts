import { canPlayCard, type GameState } from '@skipbo/game-core';

/**
 * Desktop keyboard layer. The physical key rows mirror the board rows: the digit
 * row drives the construction piles (rendered above), the top letter row drives
 * the local player's own zone (rendered below).
 *
 *         2   3   4   5           construction piles 1-4
 *     q   w e r t y   u i o p     talon | main 1-5 | défausses 1-4
 *
 * Bindings are keyed on `KeyboardEvent.code`, never on `key`. The mapping is
 * positional by design, and `code` is what preserves that shape on non-QWERTY
 * layouts — AZERTY's top row occupies the same ten physical keys, so the finger
 * pattern survives even though the printed labels differ. `key` would break it
 * twice over: AZERTY digits need Shift, and its letters sit elsewhere.
 */
export const STOCK_KEY = 'KeyQ';
export const HAND_KEYS = ['KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY'] as const;
export const DISCARD_KEYS = ['KeyU', 'KeyI', 'KeyO', 'KeyP'] as const;
export const BUILD_KEYS = ['Digit2', 'Digit3', 'Digit4', 'Digit5'] as const;

/** Every code the board layer claims. Used to decide whether to preventDefault. */
export const BOUND_CODES: ReadonlySet<string> = new Set<string>([
  STOCK_KEY,
  ...HAND_KEYS,
  ...DISCARD_KEYS,
  ...BUILD_KEYS,
  'Space',
  'Enter',
  'Escape',
]);

/**
 * QWERTY labels for the badges. Overridden at runtime by the real layout via
 * `navigator.keyboard.getLayoutMap()` where that API exists (Chromium only), so
 * an AZERTY player sees `a z e r t y u i o p` rather than a confident lie.
 */
export const FALLBACK_KEY_LABELS: Readonly<Record<string, string>> = {
  KeyQ: 'q',
  KeyW: 'w',
  KeyE: 'e',
  KeyR: 'r',
  KeyT: 't',
  KeyY: 'y',
  KeyU: 'u',
  KeyI: 'i',
  KeyO: 'o',
  KeyP: 'p',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
};

/** What the DOM looked like when the key was pressed, reduced to decisions. */
export interface KeyEventEnvironment {
  /** Focus sits in an input, textarea, select or contenteditable. */
  isTextEntry: boolean;
  /** Focus sits on something Enter/Space would activate (a button or role=button). */
  isActivatable: boolean;
  /** A modal dialog, listbox or menu is open. */
  hasOpenOverlay: boolean;
  /** A pointer drag is in progress. */
  isDragActive: boolean;
  /** A discard is armed and waiting on its Space confirmation. */
  hasArmedDiscard: boolean;
}

export interface KeyEventFlags {
  code: string;
  repeat: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}

/**
 * Whether a key press should never reach the board. Split out from the listener
 * so every guard is directly testable — these are the cases that make a global
 * key handler misbehave, and each one is a real path in this app.
 */
export function shouldIgnoreKeyEvent(event: KeyEventFlags, environment: KeyEventEnvironment): boolean {
  if (event.defaultPrevented || event.repeat) {
    return true;
  }

  // Alt is reserved as the hold-to-reveal gesture for the hint badges, and the
  // other modifiers belong to the browser (Cmd-1 switches tabs).
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return true;
  }

  // The lobby has a room-code field: `u` must type a `u` there.
  if (environment.isTextEntry || environment.hasOpenOverlay) {
    return true;
  }

  // `useDraggableCard` owns Escape for the duration of a drag.
  if (environment.isDragActive) {
    return true;
  }

  // Cards and piles carry their own Enter/Space handlers for keyboard-only
  // navigation. When one of them has focus it activates itself, so the board
  // layer must not also fire — but letters and digits still belong to us, since
  // having clicked a card is no reason to lose the shortcuts.
  //
  // The exception is an armed discard. Clicking a card focuses it (every card is
  // tabIndex=0), so in a mixed mouse-then-keyboard flow — click a card, press a
  // discard key, press Space — the focused card would otherwise eat the
  // confirmation the player is being prompted for. A pending confirmation is
  // unambiguous, so it outranks the focused element.
  if (environment.hasArmedDiscard) {
    return false;
  }

  return environment.isActivatable && (event.code === 'Space' || event.code === 'Enter');
}

export type KeyboardIntent =
  | { kind: 'select'; source: 'hand' | 'stock' | 'discard'; index: number; discardPileIndex?: number }
  | { kind: 'clearSelection' }
  | { kind: 'play'; buildPile: number }
  | { kind: 'armDiscard'; discardPile: number }
  | { kind: 'confirmDiscard'; discardPile: number }
  | { kind: 'disarm' }
  | { kind: 'help' };

export interface KeyboardEventLike {
  /** Physical key identity — what every board binding matches on. */
  code: string;
  /** Layout-dependent character. Only consulted for `?`, which has no stable code. */
  key: string;
}

/**
 * The seat the keyboard drives. Both boards re-centre the local human to index 0
 * — `GameBoard` renders `players[0]` as the bottom area, and `OnlineGameBoard`
 * renders `players[0]` locally with every other seat remote — so the keyboard
 * never needs to know which mode it is in.
 */
const LOCAL_PLAYER_INDEX = 0;

/**
 * Maps a key press onto a board intent, or `null` when the press is not
 * actionable (wrong turn, empty slot, illegal target, unbound key).
 *
 * Pure: no React, no DOM, no side effects. Every legality question is answered
 * here so the hook stays a thin listener, and so this can be exhaustively tested
 * without rendering a board.
 *
 * @param armedDiscardPile Pile index awaiting a Space confirmation, or `null`.
 */
export function resolveKeyboardIntent(
  event: KeyboardEventLike,
  gameState: GameState,
  armedDiscardPile: number | null,
): KeyboardIntent | null {
  const { code, key } = event;

  // The cheat sheet is reachable at any time — including on the opponent's turn,
  // which is exactly when a player has the spare attention to go looking for it.
  if (key === '?') {
    return { kind: 'help' };
  }

  const player = gameState.players[LOCAL_PLAYER_INDEX];
  const isLocalTurn = gameState.currentPlayerIndex === LOCAL_PLAYER_INDEX && !gameState.gameIsOver;

  if (!player || !isLocalTurn) {
    return null;
  }

  const { selectedCard } = gameState;

  if (code === 'Escape') {
    if (armedDiscardPile !== null) {
      return { kind: 'disarm' };
    }

    return selectedCard ? { kind: 'clearSelection' } : null;
  }

  if (code === 'Space' || code === 'Enter') {
    // A stale arm — the selection moved on, or was cleared, since the pile was
    // armed — must not commit a discard the player is no longer looking at.
    if (armedDiscardPile !== null && selectedCard?.source === 'hand') {
      return { kind: 'confirmDiscard', discardPile: armedDiscardPile };
    }

    return null;
  }

  if (code === STOCK_KEY) {
    const topIndex = player.stockPile.length - 1;

    if (topIndex < 0) {
      return null;
    }

    // Mirrors the click behaviour in StockPile: pressing the pile you already
    // have selected deselects it.
    if (selectedCard?.source === 'stock') {
      return { kind: 'clearSelection' };
    }

    return { kind: 'select', source: 'stock', index: topIndex };
  }

  const handIndex = HAND_KEYS.indexOf(code as (typeof HAND_KEYS)[number]);

  if (handIndex >= 0) {
    // Hands are fixed-length with `null` holes, so an in-range index is not
    // proof of a card.
    if (handIndex >= player.hand.length || !player.hand[handIndex]) {
      return null;
    }

    if (selectedCard?.source === 'hand' && selectedCard.index === handIndex) {
      return { kind: 'clearSelection' };
    }

    return { kind: 'select', source: 'hand', index: handIndex };
  }

  const discardIndex = DISCARD_KEYS.indexOf(code as (typeof DISCARD_KEYS)[number]);

  if (discardIndex >= 0) {
    if (discardIndex >= player.discardPiles.length) {
      return null;
    }

    // Contextual, exactly as the pile behaves under the mouse: with a hand card
    // in hand it is a discard target, otherwise it is a card source.
    if (selectedCard?.source === 'hand') {
      return { kind: 'armDiscard', discardPile: discardIndex };
    }

    const pile = player.discardPiles[discardIndex];

    if (pile.length === 0) {
      return null;
    }

    if (selectedCard?.source === 'discard' && selectedCard.discardPileIndex === discardIndex) {
      return { kind: 'clearSelection' };
    }

    return { kind: 'select', source: 'discard', index: pile.length - 1, discardPileIndex: discardIndex };
  }

  const buildIndex = BUILD_KEYS.indexOf(code as (typeof BUILD_KEYS)[number]);

  if (buildIndex >= 0) {
    if (buildIndex >= gameState.buildPiles.length || !selectedCard) {
      return null;
    }

    // Build plays commit immediately — they are recoverable and the legal piles
    // are already lit up by `can-drop`. Only discards, which are irreversible
    // and end the turn, take the Space confirmation.
    if (!canPlayCard(selectedCard.card, buildIndex, gameState)) {
      return null;
    }

    return { kind: 'play', buildPile: buildIndex };
  }

  return null;
}
