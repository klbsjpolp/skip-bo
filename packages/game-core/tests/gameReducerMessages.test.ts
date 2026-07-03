import { describe, expect, it } from 'vitest';

import { gameReducer } from '../src/state/gameReducer.js';
import { initialGameState } from '../src/state/initialGameState.js';
import type { Card, GameState } from '../src/types/index.js';

const card = (value: number, isSkipBo = false): Card => ({ value, isSkipBo });

const withSelectedHandCard = (value: number): GameState => {
  const state = initialGameState();
  state.currentPlayerIndex = 0;
  state.buildPiles = [[], [], [], []];
  state.players[0].hand = [card(value), card(9), null, null, null];
  state.selectedCard = { card: card(value), source: 'hand', index: 0 };
  return state;
};

describe('gameReducer message codes', () => {
  it('emits selection codes for human and AI turns', () => {
    const human = gameReducer(initialGameState(), { type: 'SELECT_CARD', source: 'hand', index: 0 });
    expect(human.message).toEqual({ code: 'SELECT_DESTINATION' });
    expect(gameReducer(human, { type: 'CLEAR_SELECTION' }).message).toEqual({ code: 'SELECT_CARD' });

    const aiTurn = initialGameState();
    aiTurn.currentPlayerIndex = 1;
    const aiSelected = gameReducer(aiTurn, { type: 'SELECT_CARD', source: 'hand', index: 0 });
    expect(aiSelected.message).toEqual({ code: 'AI_PLAYING' });
    expect(gameReducer(aiSelected, { type: 'CLEAR_SELECTION' }).message).toEqual({ code: 'AI_PLAYING' });
  });

  it('emits invalid-move codes on rejected plays and discards', () => {
    const state = initialGameState();
    expect(gameReducer(state, { type: 'PLAY_CARD', buildPile: 0 }).message).toEqual({
      code: 'INVALID_MOVE_NO_SELECTION',
    });
    expect(gameReducer(state, { type: 'DISCARD_CARD', discardPile: 0 }).message).toEqual({
      code: 'INVALID_MOVE_NO_SELECTION',
    });

    const cannotPlay = withSelectedHandCard(5);
    expect(gameReducer(cannotPlay, { type: 'PLAY_CARD', buildPile: 0 }).message).toEqual({
      code: 'INVALID_MOVE_CANNOT_PLAY',
    });

    const stockSelected = initialGameState();
    stockSelected.selectedCard = { card: card(4), source: 'stock', index: 0 };
    expect(gameReducer(stockSelected, { type: 'DISCARD_CARD', discardPile: 0 }).message).toEqual({
      code: 'INVALID_MOVE_MUST_DISCARD_FROM_HAND',
    });
  });

  it('emits CARD_PLAYED on a successful human play and TURN_ENDED on a discard', () => {
    const played = gameReducer(withSelectedHandCard(1), { type: 'PLAY_CARD', buildPile: 0 });
    expect(played.message).toEqual({ code: 'CARD_PLAYED' });

    const discarded = gameReducer(withSelectedHandCard(3), { type: 'DISCARD_CARD', discardPile: 0 });
    expect(discarded.message).toEqual({ code: 'TURN_ENDED', previousPlayerIsAI: false, nextPlayerIsAI: true });
  });

  it('emits GAME_WON with the winner kind when the stock empties', () => {
    const state = withSelectedHandCard(1);
    state.players[0].stockPile = [];
    // Playing the selected card must not be the win condition here — empty the
    // stock beforehand so the play triggers the win branch.
    const won = gameReducer(state, { type: 'PLAY_CARD', buildPile: 0 });
    expect(won.message).toEqual({ code: 'GAME_WON', winnerIsAI: false });

    const debugWon = gameReducer(initialGameState(), { type: 'DEBUG_WIN' });
    expect(debugWon.message).toEqual({ code: 'GAME_WON', winnerIsAI: false });
  });

  it('emits debug codes for each debug action', () => {
    const state = initialGameState();
    expect(gameReducer(state, { type: 'DEBUG_SET_AI_HAND', hand: [card(1)] }).message).toEqual({
      code: 'DEBUG_AI_HAND_SET',
    });
    expect(gameReducer(state, { type: 'DEBUG_FILL_BUILD_PILE', buildPile: 0 }).message).toEqual({
      code: 'DEBUG_BUILD_PILE_READY',
    });
    expect(gameReducer(state, { type: 'DEBUG_FILL_BUILD_PILE', buildPile: 99 }).message).toEqual({
      code: 'INVALID_MOVE',
    });
    expect(gameReducer(state, { type: 'DEBUG_FILL_HAND_SKIPBO' }).message).toEqual({
      code: 'DEBUG_HAND_SKIPBO_FILLED',
    });
    expect(gameReducer(state, { type: 'DEBUG_CLEAR_STOCK_PILE' }).message).toEqual({
      code: 'DEBUG_STOCK_PILE_CLEARED',
    });
    expect(gameReducer(state, { type: 'DEBUG_CLEAR_AI_STOCK_PILE' }).message).toEqual({
      code: 'DEBUG_AI_STOCK_PILE_CLEARED',
    });
  });

  it('emits INVALID_MOVE for stale selections and bad discard piles', () => {
    const staleSelection = initialGameState();
    staleSelection.players[0].hand = [card(2), null, null, null, null];
    staleSelection.buildPiles = [[], [], [], []];
    staleSelection.selectedCard = { card: card(1), source: 'hand', index: 9 };
    expect(gameReducer(staleSelection, { type: 'PLAY_CARD', buildPile: 0 }).message).toEqual({
      code: 'INVALID_MOVE',
    });

    const badPile = withSelectedHandCard(3);
    expect(gameReducer(badPile, { type: 'DISCARD_CARD', discardPile: 99 }).message).toEqual({
      code: 'INVALID_MOVE',
    });

    const noAi = initialGameState();
    noAi.players = noAi.players.map((player) => ({ ...player, isAI: false }));
    expect(gameReducer(noAi, { type: 'DEBUG_CLEAR_AI_STOCK_PILE' }).message).toEqual({ code: 'INVALID_MOVE' });
  });

  it('emits AI_PLAYING after a successful AI play', () => {
    const state = initialGameState();
    state.currentPlayerIndex = 1;
    state.buildPiles = [[], [], [], []];
    state.players[1].hand = [card(1), card(9), null, null, null];
    state.selectedCard = { card: card(1), source: 'hand', index: 0 };

    expect(gameReducer(state, { type: 'PLAY_CARD', buildPile: 0 }).message).toEqual({ code: 'AI_PLAYING' });
  });

  it('keeps GAME_START on init and INVALID_CARD_VALUE for corrupted selections', () => {
    expect(initialGameState().message).toEqual({ code: 'GAME_START' });

    const corrupted = initialGameState();
    corrupted.selectedCard = {
      card: { value: undefined as unknown as number, isSkipBo: false },
      source: 'hand',
      index: 0,
    };
    expect(gameReducer(corrupted, { type: 'DISCARD_CARD', discardPile: 0 }).message).toEqual({
      code: 'INVALID_CARD_VALUE',
    });
  });
});
