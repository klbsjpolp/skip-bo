import { useBoardKeyboard } from '@/contexts/useBoardKeyboard';
import { LOCAL_PLAYER_INDEX } from '@/game/keyboardActions';

interface KeyHintProps {
  /** `KeyboardEvent.code` of the binding this pile answers to. */
  code: string;
  /**
   * Seat this pile belongs to. Only the local seat is keyboard-driven, so an
   * opponent's pile renders nothing. Omit for piles shared by every seat (the
   * construction piles).
   */
  playerIndex?: number;
}

/**
 * The key badge under a pile.
 *
 * Always mounted, never taking layout: absolutely positioned and transparent at
 * rest, faded in by a body-level attribute the provider toggles. That is what
 * keeps the board pixel-identical when the hints are down, so the committed
 * visual baselines never have to account for this feature.
 *
 * `aria-hidden` because it is redundant for a screen reader — the pile it
 * annotates already has its own accessible name, and the badge is a visual
 * reminder of a shortcut, not content.
 */
export function KeyHint({ code, playerIndex }: KeyHintProps) {
  const { keyLabels } = useBoardKeyboard();
  const label = keyLabels[code];

  if (!label || (playerIndex !== undefined && playerIndex !== LOCAL_PLAYER_INDEX)) {
    return null;
  }

  return (
    <span className="key-hint-badge" aria-hidden="true" data-key-hint={code}>
      {label}
    </span>
  );
}
