import { describe, expect, it } from 'vitest';

import { clientMessageSchema } from '../src/schemas/websocket.js';

describe('clientMessageSchema', () => {
  it('accepts a move relay with an opaque payload', () => {
    const parsed = clientMessageSchema.parse({
      type: 'relay',
      kind: 'move',
      payload: { whatever: ['the', 'game', 'wants'], nested: { value: 7 } },
    });

    expect(parsed).toMatchObject({ type: 'relay', kind: 'move' });
  });

  it('accepts a targeted view relay', () => {
    const parsed = clientMessageSchema.parse({
      type: 'relay',
      kind: 'view',
      payload: null,
      toSeats: [1, 2],
    });

    expect(parsed).toMatchObject({ type: 'relay', kind: 'view', toSeats: [1, 2] });
  });

  it('rejects an unknown relay kind', () => {
    expect(() => clientMessageSchema.parse({ type: 'relay', kind: 'teleport', payload: 1 })).toThrow();
  });

  it('rejects out-of-range target seats', () => {
    expect(() => clientMessageSchema.parse({ type: 'relay', kind: 'move', payload: 1, toSeats: [9] })).toThrow();
  });

  it('accepts host control messages', () => {
    expect(clientMessageSchema.parse({ type: 'setTurn', currentSeatIndex: 2 })).toMatchObject({
      type: 'setTurn',
      currentSeatIndex: 2,
    });
    expect(clientMessageSchema.parse({ type: 'snapshot', payload: { deck: [] } })).toMatchObject({
      type: 'snapshot',
    });
    expect(clientMessageSchema.parse({ type: 'endGame', winnerSeatIndex: null })).toMatchObject({
      type: 'endGame',
      winnerSeatIndex: null,
    });
  });

  it('still accepts lobby + auth messages', () => {
    expect(clientMessageSchema.parse({ type: 'auth', roomCode: 'ABC', seatIndex: 0, seatToken: 't' })).toMatchObject({
      type: 'auth',
    });
    expect(clientMessageSchema.parse({ type: 'setReady', playerName: 'Léa' })).toMatchObject({
      type: 'setReady',
    });
    expect(clientMessageSchema.parse({ type: 'startGame' })).toMatchObject({ type: 'startGame' });
  });

  it('rejects the removed server-authoritative `action` message', () => {
    expect(() => clientMessageSchema.parse({ type: 'action', action: { type: 'DRAW' } })).toThrow();
  });
});
