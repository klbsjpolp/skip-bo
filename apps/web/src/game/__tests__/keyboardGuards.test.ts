import { describe, expect, it } from 'vitest';

import { shouldIgnoreKeyEvent, type KeyEventEnvironment, type KeyEventFlags } from '@/game/keyboardActions';

const event = (overrides: Partial<KeyEventFlags> = {}): KeyEventFlags => ({
  code: 'KeyW',
  repeat: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  defaultPrevented: false,
  ...overrides,
});

const environment = (overrides: Partial<KeyEventEnvironment> = {}): KeyEventEnvironment => ({
  isTextEntry: false,
  isActivatable: false,
  hasOpenOverlay: false,
  isDragActive: false,
  hasArmedDiscard: false,
  ...overrides,
});

describe('shouldIgnoreKeyEvent', () => {
  it('lets an ordinary board key through', () => {
    expect(shouldIgnoreKeyEvent(event(), environment())).toBe(false);
  });

  it('ignores a press another handler already claimed', () => {
    expect(shouldIgnoreKeyEvent(event({ defaultPrevented: true }), environment())).toBe(true);
  });

  it('ignores auto-repeat, so a held key cannot spam moves', () => {
    expect(shouldIgnoreKeyEvent(event({ repeat: true }), environment())).toBe(true);
  });

  it.each(['ctrlKey', 'metaKey', 'altKey'] as const)('leaves %s combinations to the browser', (modifier) => {
    expect(shouldIgnoreKeyEvent(event({ [modifier]: true }), environment())).toBe(true);
  });

  it('ignores keys typed into a text field', () => {
    // The lobby room-code input: `u` must type a `u`, not select a discard pile.
    expect(shouldIgnoreKeyEvent(event({ code: 'KeyU' }), environment({ isTextEntry: true }))).toBe(true);
  });

  it('ignores keys while a dialog, listbox or menu is open', () => {
    expect(shouldIgnoreKeyEvent(event(), environment({ hasOpenOverlay: true }))).toBe(true);
  });

  it('ignores keys during a pointer drag, which owns Escape itself', () => {
    expect(shouldIgnoreKeyEvent(event({ code: 'Escape' }), environment({ isDragActive: true }))).toBe(true);
  });

  it('yields Space and Enter to a focused button so it is not activated twice', () => {
    expect(shouldIgnoreKeyEvent(event({ code: 'Space' }), environment({ isActivatable: true }))).toBe(true);
    expect(shouldIgnoreKeyEvent(event({ code: 'Enter' }), environment({ isActivatable: true }))).toBe(true);
  });

  it('claims Space back from a focused card once a discard is armed', () => {
    // Mouse-click a card (which focuses it), press a discard key, press Space:
    // the confirmation the player is being prompted for must not be eaten by
    // the card that happens to still hold focus.
    expect(
      shouldIgnoreKeyEvent(event({ code: 'Space' }), environment({ isActivatable: true, hasArmedDiscard: true })),
    ).toBe(false);
  });

  it('still defers to the other guards while a discard is armed', () => {
    expect(
      shouldIgnoreKeyEvent(event({ code: 'Space' }), environment({ hasArmedDiscard: true, hasOpenOverlay: true })),
    ).toBe(true);
    expect(
      shouldIgnoreKeyEvent(event({ code: 'Space' }), environment({ hasArmedDiscard: true, isTextEntry: true })),
    ).toBe(true);
  });

  it('still claims letters and digits while a card or pile has focus', () => {
    // Having clicked a card is no reason to lose the shortcuts.
    expect(shouldIgnoreKeyEvent(event({ code: 'KeyW' }), environment({ isActivatable: true }))).toBe(false);
    expect(shouldIgnoreKeyEvent(event({ code: 'Digit2' }), environment({ isActivatable: true }))).toBe(false);
    expect(shouldIgnoreKeyEvent(event({ code: 'Escape' }), environment({ isActivatable: true }))).toBe(false);
  });
});
