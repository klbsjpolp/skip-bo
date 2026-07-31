import { describe, expect, it, vi } from 'vitest';

import { initialGameState, type Card, type GameState } from '@skipbo/game-core';

import {
  getMaxDrawAnimationDuration,
  mergeOpponentRefillTransition,
  resolveSelectableCard,
  scheduleDrawAnimations,
  type DrawTransition,
} from '@/hooks/useOnlineSkipBoGame/helpers';

const transition = { cards: [{ value: 1, isSkipBo: false }], handIndices: [0], playerIndex: 1 };

const card = (value: number, isSkipBo = false): Card => ({ value, isSkipBo });

describe('scheduleDrawAnimations', () => {
  it('fires one animateDraws per transition with the base delay', () => {
    const driver = { animateDraws: vi.fn(async () => 0) };

    scheduleDrawAnimations(driver, [transition], 250);

    expect(driver.animateDraws).toHaveBeenCalledWith(1, transition.cards, [0], 500, 250);
  });

  it('warns instead of throwing when a draw animation rejects', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const driver = { animateDraws: vi.fn(() => Promise.reject(new Error('boom'))) };

    scheduleDrawAnimations(driver, [transition]);
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith('Draw animation failed during online transition:', expect.any(Error));
    });
  });
});

describe('getMaxDrawAnimationDuration', () => {
  it('returns the max duration across transitions', () => {
    const driver = { calculateDrawsDuration: vi.fn((playerIndex: number) => (playerIndex === 1 ? 800 : 300)) };

    const max = getMaxDrawAnimationDuration(driver, [transition, { ...transition, playerIndex: 0 }], 100);

    expect(max).toBe(800);
    expect(driver.calculateDrawsDuration).toHaveBeenCalledWith(1, [0], 500, 100);
  });
});

describe('mergeOpponentRefillTransition', () => {
  // The opponent (seat 1) played the hand card at slot 2; the same view already
  // refilled that slot, so a null->card diff cannot see it.
  const statesWithOpponentHandPlay = (
    refilledSlot2: Card | null,
    nextHand: (Card | null)[] = [card(1), card(2), refilledSlot2, null, null],
  ): [GameState, GameState] => {
    const previousState = initialGameState();
    previousState.currentPlayerIndex = 1;
    previousState.selectedCard = { card: card(7), source: 'hand', index: 2 };
    previousState.players[1].hand = [card(1), card(2), card(7), null, null];

    const nextState = initialGameState();
    nextState.players[1].hand = nextHand;

    return [previousState, nextState];
  };

  it('adds a transition for the refilled slot when the opponent has no other draw', () => {
    const [previousState, nextState] = statesWithOpponentHandPlay(card(9));

    const merged = mergeOpponentRefillTransition([], previousState, nextState);

    expect(merged).toEqual([{ cards: [card(9)], handIndices: [2], playerIndex: 1 }]);
  });

  it('splices the refilled slot into an existing transition in hand order', () => {
    const [previousState, nextState] = statesWithOpponentHandPlay(card(9), [
      card(1),
      null,
      card(9),
      card(10),
      card(11),
    ]);
    const existing: DrawTransition[] = [{ cards: [card(10), card(11)], handIndices: [3, 4], playerIndex: 1 }];

    mergeOpponentRefillTransition(existing, previousState, nextState);

    expect(existing[0].handIndices).toEqual([2, 3, 4]);
    expect(existing[0].cards).toEqual([card(9), card(10), card(11)]);
  });

  it('appends when the refilled slot is after every already-detected draw', () => {
    const [previousState, nextState] = statesWithOpponentHandPlay(card(9));
    const existing: DrawTransition[] = [{ cards: [card(4)], handIndices: [0], playerIndex: 1 }];

    mergeOpponentRefillTransition(existing, previousState, nextState);

    expect(existing[0].handIndices).toEqual([0, 2]);
    expect(existing[0].cards).toEqual([card(4), card(9)]);
  });

  it('does not duplicate a slot the diff already picked up', () => {
    const [previousState, nextState] = statesWithOpponentHandPlay(card(9));
    const existing: DrawTransition[] = [{ cards: [card(9)], handIndices: [2], playerIndex: 1 }];

    mergeOpponentRefillTransition(existing, previousState, nextState);

    expect(existing[0].handIndices).toEqual([2]);
  });

  it('does nothing when the played slot was not refilled', () => {
    const [previousState, nextState] = statesWithOpponentHandPlay(null);

    expect(mergeOpponentRefillTransition([], previousState, nextState)).toEqual([]);
  });

  it('ignores plays from a non-hand source', () => {
    const [previousState, nextState] = statesWithOpponentHandPlay(card(9));
    previousState.selectedCard = { card: card(7), source: 'stock', index: 0 };

    expect(mergeOpponentRefillTransition([], previousState, nextState)).toEqual([]);
  });

  it('ignores the local seat — its own refill is handled optimistically', () => {
    const [previousState, nextState] = statesWithOpponentHandPlay(card(9));
    previousState.currentPlayerIndex = 0;

    expect(mergeOpponentRefillTransition([], previousState, nextState)).toEqual([]);
  });
});

describe('resolveSelectableCard', () => {
  const player = {
    ...initialGameState().players[0],
    discardPiles: [[card(3), card(4)], [], [], []],
    hand: [card(1), null, card(2), null, null],
    stockPile: [card(11), card(12)],
  };

  it('returns the hand card at the given slot', () => {
    expect(resolveSelectableCard(player, 'hand', 2)).toEqual(card(2));
  });

  it('returns null for an empty hand slot', () => {
    expect(resolveSelectableCard(player, 'hand', 1)).toBeNull();
  });

  it('returns the top of the stock pile, ignoring the index', () => {
    expect(resolveSelectableCard(player, 'stock', 0)).toEqual(card(12));
  });

  it('returns the top of the named discard pile', () => {
    expect(resolveSelectableCard(player, 'discard', 0, 0)).toEqual(card(4));
  });

  it('returns null for a discard selection with no pile index', () => {
    expect(resolveSelectableCard(player, 'discard', 0)).toBeNull();
  });

  it('returns undefined for an empty discard pile', () => {
    expect(resolveSelectableCard(player, 'discard', 0, 1)).toBeUndefined();
  });

  it('returns undefined for an out-of-range discard pile', () => {
    expect(resolveSelectableCard(player, 'discard', 0, 9)).toBeUndefined();
  });
});
