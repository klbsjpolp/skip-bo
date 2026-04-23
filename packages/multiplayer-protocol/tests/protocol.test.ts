import { describe, expect, it } from 'vitest';

import { initialGameState } from '@skipbo/game-core';

import {
  HIDDEN_CARD,
  MAX_PLAYER_NAME_LENGTH,
  aiCoachRequestSchema,
  aiCoachResponseSchema,
  aiLocalCoachRequestSchema,
  aiLocalCoachResponseSchema,
  aiLocalPostGameSummaryRequestSchema,
  aiLocalPostGameSummaryResponseSchema,
  aiPostGameSummaryRequestSchema,
  aiPostGameSummaryResponseSchema,
  createRoomRequestSchema,
  isValidRoomCode,
  joinRoomRequestSchema,
  normalizeRoomCode,
  resolvePlayerName,
  serializeClientGameView,
} from '../src';

describe('room code normalization', () => {
  it('normalizes case-insensitive Crockford aliases', () => {
    expect(normalizeRoomCode('ab1lo')).toBe('AB110');
    expect(isValidRoomCode('ab1lo')).toBe(true);
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
      roomCode: 'ABCDE',
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
      roomCode: 'ABCDE',
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
      roomCode: 'ABCDE',
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
    expect(joinRoomRequestSchema.parse({ playerName: 'Bob', roomCode: 'abcde' })).toEqual({
      playerName: 'Bob',
      roomCode: 'abcde',
    });
  });
});

describe('AI HTTP schemas', () => {
  it('accepts authenticated coach requests and bounded responses', () => {
    expect(aiCoachRequestSchema.parse({
      roomCode: 'ABCDE',
      roomVersion: 3,
      seatIndex: 1,
      seatToken: 'seat-token',
    })).toEqual({
      roomCode: 'ABCDE',
      roomVersion: 3,
      seatIndex: 1,
      seatToken: 'seat-token',
    });

    expect(aiCoachResponseSchema.parse({
      displayText: 'Coach: joue le 3 de ton talon vers la pile 2.',
      fallbackUsed: false,
      recommendation: {
        action: 'play',
        buildPileIndex: 1,
        card: { value: 3, isSkipBo: false },
        reasonCodes: ['play-stock'],
        score: 1003,
        source: 'stock',
        sourceIndex: 4,
      },
      roomVersion: 3,
    })).toMatchObject({
      fallbackUsed: false,
      roomVersion: 3,
    });

    expect(() => aiCoachResponseSchema.parse({
      displayText: 'x'.repeat(141),
      fallbackUsed: false,
      recommendation: {
        action: 'end',
        reasonCodes: ['no-legal-move'],
        score: 0,
      },
      roomVersion: 3,
    })).toThrow();
  });

  it('accepts authenticated post-game summary requests and bounded responses', () => {
    expect(aiPostGameSummaryRequestSchema.parse({
      roomCode: 'ABCDE',
      seatIndex: 0,
      seatToken: 'seat-token',
    })).toEqual({
      roomCode: 'ABCDE',
      seatIndex: 0,
      seatToken: 'seat-token',
    });

    expect(aiPostGameSummaryResponseSchema.parse({
      displayText: 'Résumé: victoire en 18 coups - point fort: pression sur le talon.',
      fallbackUsed: true,
      roomVersion: 9,
    })).toEqual({
      displayText: 'Résumé: victoire en 18 coups - point fort: pression sur le talon.',
      fallbackUsed: true,
      roomVersion: 9,
    });
  });

  it('accepts local coach insight requests without room credentials', () => {
    expect(aiLocalCoachRequestSchema.parse({
      localVersion: 4,
      recommendation: {
        action: 'play',
        buildPileIndex: 1,
        card: { value: 3, isSkipBo: false },
        reasonCodes: ['play-stock'],
        score: 1003,
        source: 'stock',
        sourceIndex: 4,
      },
    })).toMatchObject({
      localVersion: 4,
      recommendation: {
        action: 'play',
        source: 'stock',
      },
    });

    expect(aiLocalCoachResponseSchema.parse({
      displayText: 'Coach: joue le 3 de ton talon vers la pile 2.',
      fallbackUsed: false,
      localVersion: 4,
    })).toMatchObject({
      fallbackUsed: false,
      localVersion: 4,
    });
  });

  it('accepts bounded local post-game summary requests', () => {
    expect(aiLocalPostGameSummaryRequestSchema.parse({
      actionLog: [{
        action: 'play',
        buildPileIndex: 0,
        card: { value: 1, isSkipBo: false },
        playerIndex: 0,
        source: 'stock',
        sourceIndex: 0,
        stockCountAfter: 0,
        stockCountBefore: 1,
        version: 1,
      }],
      localVersion: 1,
      playerIndex: 0,
      winnerIndex: 0,
    })).toMatchObject({
      localVersion: 1,
      playerIndex: 0,
      winnerIndex: 0,
    });

    expect(() => aiLocalPostGameSummaryRequestSchema.parse({
      actionLog: Array.from({length: 201}, (_, index) => ({
        action: 'discard',
        card: { value: 9, isSkipBo: false },
        discardPileIndex: 0,
        playerIndex: 0,
        source: 'hand',
        sourceIndex: 0,
        stockCountAfter: 1,
        stockCountBefore: 1,
        version: index + 1,
      })),
      playerIndex: 0,
      winnerIndex: null,
    })).toThrow();

    expect(aiLocalPostGameSummaryResponseSchema.parse({
      displayText: 'Résumé: victoire en 1 coups - point fort: pression sur le talon.',
      fallbackUsed: true,
      localVersion: 1,
    })).toMatchObject({
      fallbackUsed: true,
      localVersion: 1,
    });
  });
});
