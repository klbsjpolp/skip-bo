import { describe, expect, it } from 'vitest';

import { initialGameState, type Card, type GameState } from '@skipbo/game-core';

import { BOUND_CODES, resolveKeyboardIntent, type KeyboardIntent } from '@/game/keyboardActions';

const card = (value: number, isSkipBo = false): Card => ({ value, isSkipBo });

/**
 * A board on the local player's turn: four empty build piles, a known hand, one
 * stocked discard pile. Individual tests mutate from here.
 */
const boardOnLocalTurn = (): GameState => {
  const state = initialGameState();
  state.currentPlayerIndex = 0;
  state.gameIsOver = false;
  state.buildPiles = [[], [], [], []];
  state.selectedCard = null;
  state.players[0].hand = [card(1), card(7), null, card(3), card(12)];
  state.players[0].stockPile = [card(4), card(9)];
  state.players[0].discardPiles = [[card(6)], [], [], []];
  return state;
};

const press = (code: string, key = ''): { code: string; key: string } => ({ code, key });

const resolve = (state: GameState, code: string, armed: number | null = null): KeyboardIntent | null =>
  resolveKeyboardIntent(press(code), state, armed);

describe('resolveKeyboardIntent — selection', () => {
  it('selects the stock top with q', () => {
    const state = boardOnLocalTurn();

    expect(resolve(state, 'KeyQ')).toEqual({ kind: 'select', source: 'stock', index: 1 });
  });

  it('ignores q on an empty stock', () => {
    const state = boardOnLocalTurn();
    state.players[0].stockPile = [];

    expect(resolve(state, 'KeyQ')).toBeNull();
  });

  it('maps w e r t y onto hand slots 0-4', () => {
    const state = boardOnLocalTurn();

    state.players[0].hand = [card(1), card(7), card(2), card(3), card(12)];

    expect(resolve(state, 'KeyW')).toEqual({ kind: 'select', source: 'hand', index: 0 });
    expect(resolve(state, 'KeyE')).toEqual({ kind: 'select', source: 'hand', index: 1 });
    expect(resolve(state, 'KeyR')).toEqual({ kind: 'select', source: 'hand', index: 2 });
    expect(resolve(state, 'KeyT')).toEqual({ kind: 'select', source: 'hand', index: 3 });
    expect(resolve(state, 'KeyY')).toEqual({ kind: 'select', source: 'hand', index: 4 });
  });

  it('ignores a hand key pointing at a null hole', () => {
    const state = boardOnLocalTurn();

    // Slot 2 is empty; hands keep their length and hold `null` rather than splicing.
    expect(resolve(state, 'KeyR')).toBeNull();
  });

  it('selects the top card of a stocked discard pile', () => {
    const state = boardOnLocalTurn();

    expect(resolve(state, 'KeyU')).toEqual({
      kind: 'select',
      source: 'discard',
      index: 0,
      discardPileIndex: 0,
    });
  });

  it('ignores a discard key on an empty pile when nothing is selected', () => {
    const state = boardOnLocalTurn();

    expect(resolve(state, 'KeyI')).toBeNull();
  });

  it('deselects when the already-selected source is pressed again', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(1), source: 'hand', index: 0 };

    expect(resolve(state, 'KeyW')).toEqual({ kind: 'clearSelection' });
  });

  it('deselects the stock when q is pressed twice', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(9), source: 'stock', index: 1 };

    expect(resolve(state, 'KeyQ')).toEqual({ kind: 'clearSelection' });
  });

  it('deselects a discard pile when its own key is pressed again', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(6), source: 'discard', index: 0, discardPileIndex: 0 };

    expect(resolve(state, 'KeyU')).toEqual({ kind: 'clearSelection' });
  });

  it('moves the selection to another discard pile rather than deselecting', () => {
    const state = boardOnLocalTurn();
    state.players[0].discardPiles = [[card(6)], [card(2)], [], []];
    state.selectedCard = { card: card(6), source: 'discard', index: 0, discardPileIndex: 0 };

    expect(resolve(state, 'KeyI')).toEqual({
      kind: 'select',
      source: 'discard',
      index: 0,
      discardPileIndex: 1,
    });
  });

  it('ignores a discard key pointing past the last pile', () => {
    const state = boardOnLocalTurn();
    // A board configured with fewer discard piles than there are keys.
    state.players[0].discardPiles = [[card(6)], []];

    expect(resolve(state, 'KeyO')).toBeNull();
    expect(resolve(state, 'KeyP')).toBeNull();
  });

  it('ignores a build key pointing past the last pile', () => {
    const state = boardOnLocalTurn();
    state.buildPiles = [[], []];
    state.selectedCard = { card: card(1), source: 'hand', index: 0 };

    expect(resolve(state, 'Digit4')).toBeNull();
    expect(resolve(state, 'Digit5')).toBeNull();
  });

  it('moves the selection when a different hand key is pressed', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(1), source: 'hand', index: 0 };

    expect(resolve(state, 'KeyE')).toEqual({ kind: 'select', source: 'hand', index: 1 });
  });
});

describe('resolveKeyboardIntent — build plays', () => {
  it('plays a legal card immediately, with no confirmation step', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(1), source: 'hand', index: 0 };

    expect(resolve(state, 'Digit2')).toEqual({ kind: 'play', buildPile: 0 });
  });

  it('maps 2 3 4 5 onto build piles 0-3', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(1), source: 'hand', index: 0 };

    expect(resolve(state, 'Digit3')).toEqual({ kind: 'play', buildPile: 1 });
    expect(resolve(state, 'Digit4')).toEqual({ kind: 'play', buildPile: 2 });
    expect(resolve(state, 'Digit5')).toEqual({ kind: 'play', buildPile: 3 });
  });

  it('ignores a build key when the card is illegal on that pile', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(7), source: 'hand', index: 1 };

    // An empty build pile only accepts a 1 or a Skip-Bo.
    expect(resolve(state, 'Digit2')).toBeNull();
  });

  it('plays a Skip-Bo wildcard onto any pile', () => {
    const state = boardOnLocalTurn();
    state.players[0].hand = [card(0, true), null, null, null, null];
    state.selectedCard = { card: card(0, true), source: 'hand', index: 0 };

    expect(resolve(state, 'Digit4')).toEqual({ kind: 'play', buildPile: 2 });
  });

  it('ignores a build key with nothing selected', () => {
    const state = boardOnLocalTurn();

    expect(resolve(state, 'Digit2')).toBeNull();
  });
});

describe('resolveKeyboardIntent — discard confirmation', () => {
  it('arms rather than commits when a hand card meets a discard pile', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(7), source: 'hand', index: 1 };

    expect(resolve(state, 'KeyO')).toEqual({ kind: 'armDiscard', discardPile: 2 });
  });

  it('arms an empty discard pile — an empty pile is still a legal target', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(7), source: 'hand', index: 1 };

    expect(resolve(state, 'KeyI')).toEqual({ kind: 'armDiscard', discardPile: 1 });
  });

  it('commits the armed pile on Space', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(7), source: 'hand', index: 1 };

    expect(resolve(state, 'Space', 2)).toEqual({ kind: 'confirmDiscard', discardPile: 2 });
  });

  it('accepts Enter as a confirmation alias', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(7), source: 'hand', index: 1 };

    expect(resolve(state, 'Enter', 0)).toEqual({ kind: 'confirmDiscard', discardPile: 0 });
  });

  it('ignores Space with nothing armed', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(7), source: 'hand', index: 1 };

    expect(resolve(state, 'Space')).toBeNull();
  });

  it('refuses a stale arm whose selection is no longer a hand card', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(9), source: 'stock', index: 1 };

    expect(resolve(state, 'Space', 2)).toBeNull();
  });

  it('refuses a stale arm whose selection was cleared', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = null;

    expect(resolve(state, 'Space', 2)).toBeNull();
  });

  it('re-arms when a different discard key is pressed', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(7), source: 'hand', index: 1 };

    expect(resolve(state, 'KeyP', 2)).toEqual({ kind: 'armDiscard', discardPile: 3 });
  });
});

describe('resolveKeyboardIntent — cancellation', () => {
  it('disarms first, keeping the selection intact', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(7), source: 'hand', index: 1 };

    expect(resolve(state, 'Escape', 2)).toEqual({ kind: 'disarm' });
  });

  it('clears the selection when nothing is armed', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(7), source: 'hand', index: 1 };

    expect(resolve(state, 'Escape')).toEqual({ kind: 'clearSelection' });
  });

  it('is inert with nothing selected and nothing armed', () => {
    const state = boardOnLocalTurn();

    expect(resolve(state, 'Escape')).toBeNull();
  });
});

describe('resolveKeyboardIntent — gating', () => {
  it('ignores every board key on the opponent turn', () => {
    const state = boardOnLocalTurn();
    state.currentPlayerIndex = 1;
    state.selectedCard = { card: card(1), source: 'hand', index: 0 };

    for (const code of ['KeyQ', 'KeyW', 'KeyU', 'Digit2', 'Space', 'Escape']) {
      expect(resolve(state, code, 0)).toBeNull();
    }
  });

  it('ignores every board key once the game is over', () => {
    const state = boardOnLocalTurn();
    state.gameIsOver = true;
    state.selectedCard = { card: card(1), source: 'hand', index: 0 };

    for (const code of ['KeyQ', 'KeyW', 'KeyU', 'Digit2', 'Space', 'Escape']) {
      expect(resolve(state, code, 0)).toBeNull();
    }
  });

  it('ignores unbound keys, including the deliberately empty 1', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(1), source: 'hand', index: 0 };

    for (const code of ['Digit1', 'Digit6', 'KeyA', 'KeyZ', 'Tab', 'ArrowLeft']) {
      expect(resolve(state, code)).toBeNull();
    }
  });

  it('opens the cheat sheet from ? even on the opponent turn', () => {
    const state = boardOnLocalTurn();
    state.currentPlayerIndex = 1;

    expect(resolveKeyboardIntent(press('Slash', '?'), state, null)).toEqual({ kind: 'help' });
  });

  it('resolves ? by character, so shifted layouts still reach the sheet', () => {
    const state = boardOnLocalTurn();

    // AZERTY puts `?` on Comma; the code differs, the character does not.
    expect(resolveKeyboardIntent(press('Comma', '?'), state, null)).toEqual({ kind: 'help' });
  });
});

describe('BOUND_CODES', () => {
  it('covers every code the board claims, so the hook knows what to preventDefault', () => {
    expect(BOUND_CODES).toEqual(
      new Set([
        'KeyQ',
        'KeyW',
        'KeyE',
        'KeyR',
        'KeyT',
        'KeyY',
        'KeyU',
        'KeyI',
        'KeyO',
        'KeyP',
        'Digit2',
        'Digit3',
        'Digit4',
        'Digit5',
        'Space',
        'Enter',
        'Escape',
      ]),
    );
  });

  it('does not claim Digit1', () => {
    expect(BOUND_CODES.has('Digit1')).toBe(false);
  });
});
