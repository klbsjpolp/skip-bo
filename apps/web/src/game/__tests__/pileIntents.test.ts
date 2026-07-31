import { describe, expect, it, vi } from 'vitest';

import { initialGameState, type Card, type GameState } from '@skipbo/game-core';

import { applyBoardIntent, canDiscardFromSource, resolvePileIntent } from '@/game/pileIntents';

const card = (value: number, isSkipBo = false): Card => ({ value, isSkipBo });

/**
 * A board on the local human's turn: a known hand with a `null` hole, a stocked
 * pile, one non-empty discard pile. Individual tests mutate from here.
 */
const boardOnLocalTurn = (): GameState => {
  const state = initialGameState();
  state.currentPlayerIndex = 0;
  state.gameIsOver = false;
  state.buildPiles = [[], [], [], []];
  state.selectedCard = null;
  state.players[0].isAI = false;
  state.players[0].hand = [card(1), card(7), null, card(3), card(12)];
  state.players[0].stockPile = [card(4), card(9)];
  state.players[0].discardPiles = [[card(6)], [], [], []];
  return state;
};

const selectHand = (state: GameState, index: number): void => {
  state.selectedCard = { card: state.players[0].hand[index]!, source: 'hand', index };
};

describe('resolvePileIntent — turn and seat gating', () => {
  it('is inert on a seat that is not the current player', () => {
    const state = boardOnLocalTurn();
    state.currentPlayerIndex = 1;

    expect(resolvePileIntent({ kind: 'stock', playerIndex: 0 }, state)).toBeNull();
    expect(resolvePileIntent({ kind: 'hand', playerIndex: 0, index: 0 }, state)).toBeNull();
    expect(resolvePileIntent({ kind: 'discard', playerIndex: 0, index: 0 }, state)).toBeNull();
  });

  it('is inert on an AI seat even on that seat’s turn', () => {
    const state = boardOnLocalTurn();
    state.currentPlayerIndex = 1;
    state.players[1].isAI = true;
    state.players[1].stockPile = [card(4)];

    expect(resolvePileIntent({ kind: 'stock', playerIndex: 1 }, state)).toBeNull();
  });

  it('is inert on a seat index that does not exist', () => {
    const state = boardOnLocalTurn();
    state.currentPlayerIndex = 9;

    expect(resolvePileIntent({ kind: 'stock', playerIndex: 9 }, state)).toBeNull();
  });
});

describe('resolvePileIntent — stock', () => {
  it('selects the stock top', () => {
    expect(resolvePileIntent({ kind: 'stock', playerIndex: 0 }, boardOnLocalTurn())).toEqual({
      kind: 'select',
      source: 'stock',
      index: 1,
    });
  });

  it('is inert when the stock is empty (rule 3)', () => {
    const state = boardOnLocalTurn();
    state.players[0].stockPile = [];

    expect(resolvePileIntent({ kind: 'stock', playerIndex: 0 }, state)).toBeNull();
  });

  it('deselects the stock when it is already the selected source (rule 2)', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(9), source: 'stock', index: 1 };

    expect(resolvePileIntent({ kind: 'stock', playerIndex: 0 }, state)).toEqual({ kind: 'clearSelection' });
  });

  it('switches selection to the stock when another source is selected', () => {
    const state = boardOnLocalTurn();
    selectHand(state, 0);

    expect(resolvePileIntent({ kind: 'stock', playerIndex: 0 }, state)).toEqual({
      kind: 'select',
      source: 'stock',
      index: 1,
    });
  });
});

describe('resolvePileIntent — hand', () => {
  it('selects a filled hand slot', () => {
    expect(resolvePileIntent({ kind: 'hand', playerIndex: 0, index: 3 }, boardOnLocalTurn())).toEqual({
      kind: 'select',
      source: 'hand',
      index: 3,
    });
  });

  it('is inert on a null hole — hands keep their length rather than splicing (rule 3)', () => {
    expect(resolvePileIntent({ kind: 'hand', playerIndex: 0, index: 2 }, boardOnLocalTurn())).toBeNull();
  });

  it('is inert on an out-of-range or unparsed index', () => {
    const state = boardOnLocalTurn();

    expect(resolvePileIntent({ kind: 'hand', playerIndex: 0, index: 99 }, state)).toBeNull();
    // What a missing `data-card-index` attribute parses to in the click path.
    expect(resolvePileIntent({ kind: 'hand', playerIndex: 0, index: Number.NaN }, state)).toBeNull();
  });

  it('deselects the hand card that is already selected (rule 2)', () => {
    const state = boardOnLocalTurn();
    selectHand(state, 1);

    expect(resolvePileIntent({ kind: 'hand', playerIndex: 0, index: 1 }, state)).toEqual({ kind: 'clearSelection' });
  });

  it('moves the selection to a different hand card rather than deselecting', () => {
    const state = boardOnLocalTurn();
    selectHand(state, 1);

    expect(resolvePileIntent({ kind: 'hand', playerIndex: 0, index: 0 }, state)).toEqual({
      kind: 'select',
      source: 'hand',
      index: 0,
    });
  });
});

describe('resolvePileIntent — discard', () => {
  it('is a discard target while a hand card is selected (rule 1)', () => {
    const state = boardOnLocalTurn();
    selectHand(state, 0);

    expect(resolvePileIntent({ kind: 'discard', playerIndex: 0, index: 2 }, state)).toEqual({
      kind: 'discard',
      discardPile: 2,
    });
  });

  it('accepts a hand card onto an empty pile — emptiness only blocks it as a source', () => {
    const state = boardOnLocalTurn();
    selectHand(state, 0);

    expect(state.players[0].discardPiles[1]).toHaveLength(0);
    expect(resolvePileIntent({ kind: 'discard', playerIndex: 0, index: 1 }, state)).toEqual({
      kind: 'discard',
      discardPile: 1,
    });
  });

  it('is a card source when nothing is selected (rule 1)', () => {
    expect(resolvePileIntent({ kind: 'discard', playerIndex: 0, index: 0 }, boardOnLocalTurn())).toEqual({
      kind: 'select',
      source: 'discard',
      index: 0,
      discardPileIndex: 0,
    });
  });

  it('selects the top card of a deeper pile', () => {
    const state = boardOnLocalTurn();
    state.players[0].discardPiles[0] = [card(6), card(2), card(11)];

    expect(resolvePileIntent({ kind: 'discard', playerIndex: 0, index: 0 }, state)).toEqual({
      kind: 'select',
      source: 'discard',
      index: 2,
      discardPileIndex: 0,
    });
  });

  it('is a card source, not a discard target, when a stock card is selected (rule 1)', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(9), source: 'stock', index: 1 };

    expect(resolvePileIntent({ kind: 'discard', playerIndex: 0, index: 0 }, state)).toEqual({
      kind: 'select',
      source: 'discard',
      index: 0,
      discardPileIndex: 0,
    });
  });

  it('is inert as a source when the pile is empty (rule 3)', () => {
    expect(resolvePileIntent({ kind: 'discard', playerIndex: 0, index: 1 }, boardOnLocalTurn())).toBeNull();
  });

  it('is inert on a pile index that does not exist', () => {
    expect(resolvePileIntent({ kind: 'discard', playerIndex: 0, index: 9 }, boardOnLocalTurn())).toBeNull();
  });

  it('deselects the discard pile that is already the selected source (rule 2)', () => {
    const state = boardOnLocalTurn();
    state.selectedCard = { card: card(6), source: 'discard', index: 0, discardPileIndex: 0 };

    expect(resolvePileIntent({ kind: 'discard', playerIndex: 0, index: 0 }, state)).toEqual({
      kind: 'clearSelection',
    });
  });

  it('moves the selection to another discard pile rather than deselecting', () => {
    const state = boardOnLocalTurn();
    state.players[0].discardPiles[3] = [card(8)];
    state.selectedCard = { card: card(6), source: 'discard', index: 0, discardPileIndex: 0 };

    expect(resolvePileIntent({ kind: 'discard', playerIndex: 0, index: 3 }, state)).toEqual({
      kind: 'select',
      source: 'discard',
      index: 0,
      discardPileIndex: 3,
    });
  });
});

describe('resolvePileIntent — selection-first invariant', () => {
  it('never plays a card: pressing a pile only ever selects, deselects or discards', () => {
    const state = boardOnLocalTurn();
    const targets = [
      { kind: 'stock' as const, playerIndex: 0 },
      ...[0, 1, 2, 3, 4].map((index) => ({ kind: 'hand' as const, playerIndex: 0, index })),
      ...[0, 1, 2, 3].map((index) => ({ kind: 'discard' as const, playerIndex: 0, index })),
    ];
    const selections = [null, { card: card(1), source: 'hand' as const, index: 0 }];

    for (const selectedCard of selections) {
      state.selectedCard = selectedCard;

      for (const target of targets) {
        const intent = resolvePileIntent(target, state);

        expect(intent === null || ['select', 'clearSelection', 'discard'].includes(intent.kind)).toBe(true);
      }
    }
  });
});

describe('canDiscardFromSource', () => {
  it('allows the hand and nothing else', () => {
    expect(canDiscardFromSource('hand')).toBe(true);
    expect(canDiscardFromSource('stock')).toBe(false);
    expect(canDiscardFromSource('discard')).toBe(false);
  });
});

describe('applyBoardIntent', () => {
  const handlers = () => ({
    selectCard: vi.fn(),
    clearSelection: vi.fn(),
    discardCard: vi.fn().mockResolvedValue({ success: true, message: '' }),
  });

  it('does nothing for an inert press', () => {
    const h = handlers();
    applyBoardIntent(null, h);

    expect(h.selectCard).not.toHaveBeenCalled();
    expect(h.clearSelection).not.toHaveBeenCalled();
    expect(h.discardCard).not.toHaveBeenCalled();
  });

  it('forwards a discard-pile selection with its pile index', () => {
    const h = handlers();
    applyBoardIntent({ kind: 'select', source: 'discard', index: 2, discardPileIndex: 3 }, h);

    expect(h.selectCard).toHaveBeenCalledWith('discard', 2, 3);
  });

  it('forwards a hand selection without a pile index', () => {
    const h = handlers();
    applyBoardIntent({ kind: 'select', source: 'hand', index: 1 }, h);

    expect(h.selectCard).toHaveBeenCalledWith('hand', 1, undefined);
  });

  it('clears the selection', () => {
    const h = handlers();
    applyBoardIntent({ kind: 'clearSelection' }, h);

    expect(h.clearSelection).toHaveBeenCalledOnce();
  });

  it('discards onto the resolved pile', () => {
    const h = handlers();
    applyBoardIntent({ kind: 'discard', discardPile: 2 }, h);

    expect(h.discardCard).toHaveBeenCalledWith(2);
  });
});
