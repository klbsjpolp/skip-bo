import { FALLBACK_KEY_LABELS } from '@/game/keyboardActions';

/**
 * Policy for the key-hint badges under each pile.
 *
 * Two independent reveals, deliberately kept separate:
 *
 * - **Auto-reveal** — unprompted, once per session, on the first turn the player
 *   can actually act on. It is the only thing that ever appears without being
 *   asked for, and the only way someone who has never pressed a key finds out
 *   the shortcuts exist.
 * - **Activity reveal** — any key press, or holding Alt, brings the badges back
 *   for as long as the player keeps going. Pressing a key is a declaration that
 *   they want the keyboard, so it is always answered.
 *
 * That split is what lets the auto-reveal be short and one-shot: forgetting the
 * map costs one keystroke, not a hunt through a menu.
 */

/** Session-scoped, so the hint returns on the next launch but not next game. */
const HINT_SHOWN_KEY = 'skipbo_keyboard_hint_shown';

/** How long the unprompted reveal stays up. */
export const AUTO_REVEAL_MS = 4000;

/** Idle delay after the last key press before the badges fade again. */
export const ACTIVITY_REVEAL_MS = 3000;

/**
 * Lets the first interactive frame settle before fading the badges in, so the
 * reveal doesn't collide with the tail of the opening deal animation.
 */
export const AUTO_REVEAL_DELAY_MS = 300;

export const hasSeenKeyHintsThisSession = (): boolean => {
  try {
    return sessionStorage.getItem(HINT_SHOWN_KEY) === 'true';
  } catch {
    return false;
  }
};

export const markKeyHintsSeenThisSession = (): void => {
  try {
    sessionStorage.setItem(HINT_SHOWN_KEY, 'true');
  } catch {
    /* ignore */
  }
};

export interface AutoRevealInput {
  /** The keyboard layer is live (a real game, not the lobby). */
  isEnabled: boolean;
  /** The unprompted reveal already fired this session. */
  hasSeenThisSession: boolean;
  /** A physical keyboard is plausibly present. */
  hasKeyboardPointer: boolean;
  /** It is the local player's turn. */
  isLocalTurn: boolean;
  /** Cards are still in flight. */
  isAnimating: boolean;
}

/**
 * Whether to fire the unprompted reveal right now. Pure so the conditions can be
 * tested without faking a board, a clock and a media query at once.
 */
export function shouldAutoRevealKeyHints({
  isEnabled,
  hasSeenThisSession,
  hasKeyboardPointer,
  isLocalTurn,
  isAnimating,
}: AutoRevealInput): boolean {
  return isEnabled && !hasSeenThisSession && hasKeyboardPointer && isLocalTurn && !isAnimating;
}

/**
 * There is no API for "is a keyboard attached", so this is a proxy: a fine
 * pointer with hover means a mouse or trackpad, which in practice means a
 * desktop. It misses an iPad with a Magic Keyboard, whose primary pointer is
 * still coarse — those players reach the hints through Alt or `?` instead.
 */
export const hasKeyboardPointer = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(pointer: fine) and (hover: hover)').matches;
};

interface KeyboardLayoutCapableNavigator extends Navigator {
  keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> };
}

/**
 * Badge labels for the bound keys. The bindings are positional (`KeyboardEvent.
 * code`), so on a non-QWERTY layout the printed letters differ from the code
 * names — an AZERTY player presses the keys labelled `a z e r t y u i o p`. The
 * KeyboardLayoutMap API reports the real labels where it exists (Chromium only);
 * elsewhere the QWERTY names are the honest best guess.
 */
export const resolveKeyLabels = async (): Promise<Record<string, string>> => {
  const getLayoutMap = (navigator as KeyboardLayoutCapableNavigator).keyboard?.getLayoutMap;

  if (typeof getLayoutMap !== 'function') {
    return FALLBACK_KEY_LABELS;
  }

  try {
    const layoutMap = await getLayoutMap.call((navigator as KeyboardLayoutCapableNavigator).keyboard);

    return Object.fromEntries(
      Object.entries(FALLBACK_KEY_LABELS).map(([code, fallback]) => [code, layoutMap.get(code) ?? fallback]),
    );
  } catch {
    return FALLBACK_KEY_LABELS;
  }
};
