import type { CSSProperties } from 'react';

import { useBoardKeyboard } from '@/contexts/useBoardKeyboard';

interface KeyHintProps {
  /** `KeyboardEvent.code` of the binding this pile answers to. */
  code: string;
  /** Overrides the default centring when the badge cannot anchor to its slot. */
  style?: CSSProperties;
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
export function KeyHint({ code, style }: KeyHintProps) {
  const { keyLabels } = useBoardKeyboard();
  const label = keyLabels[code];

  if (!label) {
    return null;
  }

  return (
    <span className="key-hint-badge" aria-hidden="true" data-key-hint={code} style={style}>
      {label}
    </span>
  );
}
