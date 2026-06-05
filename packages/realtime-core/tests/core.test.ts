import { describe, expect, it } from 'vitest';

import { isValidRoomCode, normalizeRoomCode } from '../src/code.js';
import { isProtocolVersionSupported, PROTOCOL_VERSION } from '../src/version.js';
import { shuffle } from '../src/shuffle.js';
import { createRoomRequestSchema } from '../src/schemas/http.js';

describe('room code', () => {
  it('normalizes and validates codes', () => {
    expect(normalizeRoomCode(' ab-c ')).toBe('ABC');
    expect(isValidRoomCode('ABC')).toBe(true);
    expect(isValidRoomCode('AIO')).toBe(false); // I and O are not in the alphabet
  });
});

describe('protocol version', () => {
  it('rejects clients below the minimum (v1 relay break)', () => {
    expect(isProtocolVersionSupported(undefined)).toBe(false);
    expect(isProtocolVersionSupported(1)).toBe(false);
    expect(isProtocolVersionSupported(PROTOCOL_VERSION)).toBe(true);
  });
});

describe('shuffle', () => {
  it('preserves the multiset of elements', () => {
    const input = [0, 1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect(out).toHaveLength(input.length);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([0, 1, 2, 3, 4, 5]); // input not mutated
  });
});

describe('createRoomRequestSchema', () => {
  it('accepts an opaque gameConfig and a gameId', () => {
    const parsed = createRoomRequestSchema.parse({
      gameId: 'skipbo',
      gameConfig: { stockSize: 20 },
      playerName: 'Léa',
    });
    expect(parsed.gameId).toBe('skipbo');
  });

  it('accepts an empty request', () => {
    expect(createRoomRequestSchema.parse({})).toEqual({});
  });
});
