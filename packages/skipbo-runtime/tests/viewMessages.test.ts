import { describe, expect, it } from 'vitest';

import { initialGameState, type GameState } from '@skipbo/game-core';

import { createOnlineInitialGameState, createWaitingRoomState } from '../src/gameLogic.js';
import { serializeClientGameView } from '../src/views.js';

const viewFor = (state: GameState, overrides: Partial<Parameters<typeof serializeClientGameView>[0]> = {}) =>
  serializeClientGameView({
    connectedSeats: [0, 1],
    expiresAt: new Date('2026-07-03T12:00:00.000Z').toISOString(),
    gameState: state,
    roomCode: 'ABC',
    status: 'ACTIVE',
    version: 1,
    viewerSeatIndex: 0,
    ...overrides,
  });

const twoHumans = (): GameState => {
  const state = initialGameState();
  state.players = state.players.map((player, playerIndex) => ({
    ...player,
    isAI: false,
    seatIndex: playerIndex,
  }));
  return state;
};

describe('view message codes', () => {
  it('reports waiting codes before the game starts', () => {
    expect(viewFor(twoHumans(), { status: 'WAITING', connectedSeats: [0] }).message).toEqual({
      code: 'WAITING_FOR_PLAYERS',
    });
    expect(viewFor(twoHumans(), { status: 'WAITING' }).message).toEqual({ code: 'WAITING_FOR_START' });
  });

  it('reports YOUR_TURN / SELECT_DESTINATION for the active viewer', () => {
    const state = twoHumans();
    expect(viewFor(state).message).toEqual({ code: 'YOUR_TURN' });

    state.selectedCard = { card: { value: 1, isSkipBo: false }, source: 'hand', index: 0 };
    expect(viewFor(state).message).toEqual({ code: 'SELECT_DESTINATION' });
  });

  it('reports the opponent turn with name and stock count for the waiting viewer', () => {
    const state = twoHumans();
    const view = viewFor(state, { viewerSeatIndex: 1 });
    expect(view.message).toEqual({
      code: 'OPPONENT_TURN',
      playerName: 'Joueur 1',
      stockPileLength: state.players[0].stockPile.length,
    });
  });

  it('reports win codes relative to the viewer', () => {
    const state = twoHumans();
    state.gameIsOver = true;
    state.winnerIndex = 0;

    expect(viewFor(state).message).toEqual({ code: 'YOU_WON' });
    expect(viewFor(state, { viewerSeatIndex: 1 }).message).toEqual({
      code: 'OPPONENT_WON',
      winnerName: 'Joueur 1',
    });
  });

  it('seeds runtime-created states with message codes', () => {
    expect(createWaitingRoomState().message).toEqual({ code: 'WAITING_FOR_PLAYERS' });
    expect(createOnlineInitialGameState().message).toEqual({ code: 'YOUR_TURN' });
  });
});
