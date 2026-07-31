import { canPlayCard, type GameState } from '@skipbo/game-core';

import { resolvePileIntent, type BoardIntent } from '@/game/pileIntents';

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
export const HAND_KEYS: readonly string[] = ['KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY'];
export const DISCARD_KEYS: readonly string[] = ['KeyU', 'KeyI', 'KeyO', 'KeyP'];
export const BUILD_KEYS: readonly string[] = ['Digit2', 'Digit3', 'Digit4', 'Digit5'];

/** Every pile binding, in board order. The single list new bindings are added to. */
const BOARD_CODES: readonly string[] = [STOCK_KEY, ...HAND_KEYS, ...DISCARD_KEYS, ...BUILD_KEYS];

/** Every code the board layer claims. Used to decide whether to preventDefault. */
export const BOUND_CODES: ReadonlySet<string> = new Set<string>([...BOARD_CODES, 'Space', 'Enter', 'Escape']);

/**
 * QWERTY labels for the badges, derived from the codes themselves so a new
 * binding is labelled automatically rather than needing a second list kept in
 * sync. Overridden at runtime by the real layout via
 * `navigator.keyboard.getLayoutMap()` where that API exists (Chromium only), so
 * an AZERTY player sees `a z e r t y u i o p` rather than a confident lie.
 */
export const FALLBACK_KEY_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  BOARD_CODES.map((code) => [code, code.replace(/^(?:Key|Digit)/, '').toLowerCase()]),
);

/**
 * The seat the keyboard drives, and the only one whose piles carry hint badges.
 * Both boards re-centre the local human here — `GameBoard` renders `players[0]`
 * as the bottom area, and `OnlineGameBoard` renders `players[0]` locally with
 * every other seat remote — so nothing downstream needs to know which mode it is
 * in.
 */
export const LOCAL_PLAYER_INDEX = 0;

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

/**
 * Pile presses reuse the board-wide {@link BoardIntent} outcomes; the rest are
 * keyboard-only. `discard` is deliberately excluded — a click discards on the
 * spot, but the keyboard arms first and commits on Space (see
 * {@link toKeyboardIntent}).
 */
export type KeyboardIntent =
  | Exclude<BoardIntent, { kind: 'discard' }>
  | { kind: 'play'; buildPile: number }
  | { kind: 'armDiscard'; discardPile: number }
  | { kind: 'confirmDiscard'; discardPile: number }
  | { kind: 'disarm' }
  | { kind: 'help' };

/**
 * The keyboard's only departure from the click behaviour: an immediate discard
 * becomes an armed one. A discard is irreversible and ends the turn, and a
 * mistyped letter is far easier than a mis-aimed click, so it waits for a Space
 * confirmation. Every other pile outcome passes through untouched.
 */
const toKeyboardIntent = (intent: BoardIntent | null): KeyboardIntent | null =>
  intent?.kind === 'discard' ? { kind: 'armDiscard', discardPile: intent.discardPile } : intent;

export interface KeyboardEventLike {
  /** Physical key identity — what every board binding matches on. */
  code: string;
  /** Layout-dependent character. Only consulted for `?`, which has no stable code. */
  key: string;
}

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

  // Every pile binding below defers to `resolvePileIntent`, so a key press and a
  // click on the same pile can no longer disagree.
  if (code === STOCK_KEY) {
    return toKeyboardIntent(resolvePileIntent({ kind: 'stock', playerIndex: LOCAL_PLAYER_INDEX }, gameState));
  }

  const handIndex = HAND_KEYS.indexOf(code);

  if (handIndex >= 0) {
    return toKeyboardIntent(
      resolvePileIntent({ kind: 'hand', playerIndex: LOCAL_PLAYER_INDEX, index: handIndex }, gameState),
    );
  }

  const discardIndex = DISCARD_KEYS.indexOf(code);

  if (discardIndex >= 0) {
    return toKeyboardIntent(
      resolvePileIntent({ kind: 'discard', playerIndex: LOCAL_PLAYER_INDEX, index: discardIndex }, gameState),
    );
  }

  const buildIndex = BUILD_KEYS.indexOf(code);

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
