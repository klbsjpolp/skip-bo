import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FALLBACK_KEY_LABELS } from '@/game/keyboardActions';
import {
  hasKeyboardPointer,
  hasSeenKeyHintsThisSession,
  markKeyHintsSeenThisSession,
  resolveKeyLabels,
  shouldAutoRevealKeyHints,
  type AutoRevealInput,
} from '@/game/keyHints';

const ready: AutoRevealInput = {
  isEnabled: true,
  hasSeenThisSession: false,
  hasKeyboardPointer: true,
  isLocalTurn: true,
  isAnimating: false,
};

describe('shouldAutoRevealKeyHints', () => {
  it('fires on the first settled local turn', () => {
    expect(shouldAutoRevealKeyHints(ready)).toBe(true);
  });

  it('stays down once it has already fired this session', () => {
    expect(shouldAutoRevealKeyHints({ ...ready, hasSeenThisSession: true })).toBe(false);
  });

  it('stays down while the keyboard layer is disabled', () => {
    expect(shouldAutoRevealKeyHints({ ...ready, isEnabled: false })).toBe(false);
  });

  it('stays down on touch-primary devices', () => {
    expect(shouldAutoRevealKeyHints({ ...ready, hasKeyboardPointer: false })).toBe(false);
  });

  it('waits for the local turn rather than showing during the opponent move', () => {
    expect(shouldAutoRevealKeyHints({ ...ready, isLocalTurn: false })).toBe(false);
  });

  it('waits for the deal to finish so it does not flash over flying cards', () => {
    expect(shouldAutoRevealKeyHints({ ...ready, isAnimating: true })).toBe(false);
  });
});

describe('session flag', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('starts unset and records once marked', () => {
    expect(hasSeenKeyHintsThisSession()).toBe(false);

    markKeyHintsSeenThisSession();

    expect(hasSeenKeyHintsThisSession()).toBe(true);
  });

  it('treats a throwing sessionStorage as "not seen" rather than crashing', () => {
    // Safari in private mode, and any browser with storage blocked. Swapping the
    // global out beats spying: the binding may be a jsdom Storage proxy or the
    // MemoryStorage polyfill from vitest.setup, and a spy does not stick to both.
    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    vi.stubGlobal('sessionStorage', throwing);

    expect(() => markKeyHintsSeenThisSession()).not.toThrow();
    expect(hasSeenKeyHintsThisSession()).toBe(false);

    vi.unstubAllGlobals();
  });
});

describe('hasKeyboardPointer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is true for a fine, hovering pointer', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

    expect(hasKeyboardPointer()).toBe(true);
  });

  it('is false for a coarse pointer', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

    expect(hasKeyboardPointer()).toBe(false);
  });

  it('is false where matchMedia does not exist, rather than throwing', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(hasKeyboardPointer()).toBe(false);
  });
});

describe('resolveKeyLabels', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'keyboard');
  });

  it('falls back to QWERTY names where the layout API is missing', async () => {
    await expect(resolveKeyLabels()).resolves.toEqual(FALLBACK_KEY_LABELS);
  });

  it('uses the real printed labels where the layout API exists', async () => {
    // An AZERTY layout: the same physical keys, different legends.
    const layout = new Map([
      ['KeyQ', 'a'],
      ['KeyW', 'z'],
    ]);
    Reflect.set(navigator, 'keyboard', { getLayoutMap: () => Promise.resolve(layout) });

    const labels = await resolveKeyLabels();

    expect(labels.KeyQ).toBe('a');
    expect(labels.KeyW).toBe('z');
    // Codes the layout map doesn't report keep their fallback.
    expect(labels.Digit2).toBe('2');
    expect(labels.KeyE).toBe('e');
  });

  it('falls back when the layout API rejects', async () => {
    Reflect.set(navigator, 'keyboard', { getLayoutMap: () => Promise.reject(new Error('nope')) });

    await expect(resolveKeyLabels()).resolves.toEqual(FALLBACK_KEY_LABELS);
  });
});
