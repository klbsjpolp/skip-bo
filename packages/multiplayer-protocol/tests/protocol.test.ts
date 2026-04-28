import { describe, expect, it } from 'vitest';

import { initialGameState } from '@skipbo/game-core';

import {
  HIDDEN_CARD,
  MAX_PLAYER_NAME_LENGTH,
  createRoomRequestSchema,
  isValidRoomCode,
  joinRoomRequestSchema,
  normalizeRoomCode,
  resolvePlayerName,
  serializeClientGameView,
} from '../src/index.js';

describe('room code normalization', () => {
  it('uppercases and trims input', () => {
    expect(normalizeRoomCode('  abc  ')).toBe('ABC');
    expect(isValidRoomCode('abc')).toBe(true);
  });

  it('rejects ambiguous letters and digits', () => {
    expect(isValidRoomCode('ILO')).toBe(false);
    expect(isValidRoomCode('123')).toBe(false);
  });
});

describe('serializeClientGameView', () => {
  it('redacts the opponent hand and keeps the local hand visible', () => {
    const state = initialGameState();
    state.players[1].isAI = false;

    const view = serializeClientGameView({
      connectedSeats: [0, 1],
      expiresAt: new Date('2026-04-04T12:00:00.000Z').toISOString(),
      gameState: state,
      roomCode: 'ABC',
      status: 'ACTIVE',
      version: 1,
      viewerSeatIndex: 0,
    });

    expect(view.players[0].hand[0]).toEqual(state.players[0].hand[0]);
    expect(view.players[1].hand[0]).toEqual(HIDDEN_CARD);
  });

  it('keeps the full local stock pile visible while redacting opponent stock cards', () => {
    const state = initialGameState();
    state.players[1].isAI = false;
    state.players[0].stockPile = [
      { value: 3, isSkipBo: false },
      { value: 4, isSkipBo: false },
      { value: 5, isSkipBo: false },
    ];
    state.players[1].stockPile = [
      { value: 8, isSkipBo: false },
      { value: 9, isSkipBo: false },
      { value: 10, isSkipBo: false },
    ];

    const view = serializeClientGameView({
      connectedSeats: [0, 1],
      expiresAt: new Date('2026-04-04T12:00:00.000Z').toISOString(),
      gameState: state,
      roomCode: 'ABC',
      status: 'ACTIVE',
      version: 1,
      viewerSeatIndex: 0,
    });

    expect(view.players[0].stockPile).toEqual(state.players[0].stockPile);
    expect(view.players[1].stockPile).toEqual([
      HIDDEN_CARD,
      HIDDEN_CARD,
      state.players[1].stockPile[2],
    ]);
  });

  it('rotates multiplayer seats into a viewer-relative order and exposes room metadata', () => {
    const state = initialGameState({ playerCount: 4 });
    state.players = state.players.map((player, playerIndex) => ({
      ...player,
      isAI: false,
      name: resolvePlayerName(playerIndex === 2 ? 'Camille' : undefined, playerIndex),
      seatIndex: playerIndex,
    }));

    const view = serializeClientGameView({
      connectedSeats: [0, 2, 3],
      expiresAt: new Date('2026-04-04T12:00:00.000Z').toISOString(),
      gameState: state,
      hostSeatIndex: 0,
      roomCode: 'ABC',
      seatCapacity: 4,
      status: 'WAITING',
      version: 3,
      viewerSeatIndex: 2,
    });

    expect(view.players).toHaveLength(4);
    expect(view.players[0].relativeSeatIndex).toBe(0);
    expect(view.players[0].seatIndex).toBe(2);
    expect(view.players[0].displayName).toBe('Camille');
    expect(view.players[1].seatIndex).toBe(3);
    expect(view.players[1].displayName).toBe('Joueur 4');
    expect(view.players[2].seatIndex).toBe(0);
    expect(view.room.hostSeatIndex).toBe(0);
    expect(view.room.seatCapacity).toBe(4);
    expect(view.message).toBe('En attente du démarrage');
  });

  it('exposes disconnected seats in the room summary, defaulting to an empty array', () => {
    const state = initialGameState();

    const baseInput = {
      connectedSeats: [0],
      expiresAt: new Date('2026-04-04T12:00:00.000Z').toISOString(),
      gameState: state,
      roomCode: 'ABC',
      status: 'ACTIVE' as const,
      version: 1,
      viewerSeatIndex: 0,
    };

    const viewWithoutDisconnects = serializeClientGameView(baseInput);
    expect(viewWithoutDisconnects.room.disconnectedSeats).toEqual([]);

    const viewWithDisconnects = serializeClientGameView({
      ...baseInput,
      disconnectedSeats: [{ seatIndex: 1, disconnectedAt: '2026-04-04T11:59:00.000Z' }],
    });
    expect(viewWithDisconnects.room.disconnectedSeats).toEqual([
      { seatIndex: 1, disconnectedAt: '2026-04-04T11:59:00.000Z' },
    ]);
  });
});

describe('createRoomRequestSchema', () => {
  it('accepts supported stock sizes and optional player names, and rejects unsupported values', () => {
    expect(createRoomRequestSchema.parse({ playerName: 'Alice', stockSize: 35 })).toEqual({
      playerName: 'Alice',
      stockSize: 35,
    });
    expect(() => createRoomRequestSchema.parse({ stockSize: 7 })).toThrow();
    expect(() => createRoomRequestSchema.parse({ playerName: 'a'.repeat(MAX_PLAYER_NAME_LENGTH + 1) })).toThrow();
  });
});

describe('joinRoomRequestSchema', () => {
  it('accepts optional player names and normalizes only the room code downstream', () => {
    expect(joinRoomRequestSchema.parse({ playerName: 'Bob', roomCode: 'abc' })).toEqual({
      playerName: 'Bob',
      roomCode: 'abc',
    });
  });
});
