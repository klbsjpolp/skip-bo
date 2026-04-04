import { describe, expect, it } from 'vitest';

import { initialGameState } from '@skipbo/game-core';

import { HIDDEN_CARD, createRoomRequestSchema, isValidRoomCode, normalizeRoomCode, serializeClientGameView } from '../src/index.js';

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
});

describe('createRoomRequestSchema', () => {
  it('accepts supported stock sizes and rejects unsupported ones', () => {
    expect(createRoomRequestSchema.parse({ stockSize: 35 })).toEqual({ stockSize: 35 });
    expect(() => createRoomRequestSchema.parse({ stockSize: 7 })).toThrow();
  });
});
