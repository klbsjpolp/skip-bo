import { describe, expect, it } from 'vitest';

import { SkipboHost } from '../src/hostRuntime.js';
import { skipboActionSchema } from '../src/actionSchema.js';

const ROOM = {
  connectedSeats: [2, 3],
  expiresAt: new Date('2026-04-04T12:00:00.000Z').toISOString(),
  hostSeatIndex: 2,
  roomCode: 'ABC',
  seatCapacity: 4,
  status: 'ACTIVE' as const,
  version: 1,
};

describe('SkipboHost', () => {
  it('maps abstract seats to player-array order', () => {
    const host = SkipboHost.create({ activeSeatIndices: [2, 0, 3] });

    expect(host.seatToPlayerIndex(2)).toBe(0);
    expect(host.seatToPlayerIndex(0)).toBe(1);
    expect(host.seatToPlayerIndex(3)).toBe(2);
    expect(host.playerIndexToSeat(0)).toBe(2);
    expect(host.currentSeatIndex()).toBe(2);
  });

  it('rejects a move from a seat whose turn it is not', () => {
    const host = SkipboHost.create({ activeSeatIndices: [2, 3] });
    // currentSeatIndex is 2; seat 3 plays out of turn.
    const result = host.applyMove(3, { type: 'SELECT_CARD', source: 'hand', index: 0 });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('It is not your turn');
  });

  it('rejects an unknown seat', () => {
    const host = SkipboHost.create({ activeSeatIndices: [2, 3] });
    const result = host.applyMove(1, { type: 'END_TURN' });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Seat is not active in this room');
  });

  it('applies a legal move from the current seat', () => {
    const host = SkipboHost.create({ activeSeatIndices: [2, 3] });
    const result = host.applyMove(2, { type: 'SELECT_CARD', source: 'hand', index: 0 });

    expect(result.ok).toBe(true);
    expect(host.getState().selectedCard).not.toBeNull();
  });

  it('gates debug actions behind allowDebug', () => {
    const blocked = SkipboHost.create({ activeSeatIndices: [2, 3], allowDebug: false });
    expect(blocked.applyMove(2, { type: 'DEBUG_WIN' }).ok).toBe(false);

    const allowed = SkipboHost.create({ activeSeatIndices: [2, 3], allowDebug: true });
    expect(allowed.applyMove(2, { type: 'DEBUG_WIN' }).ok).toBe(true);
    expect(allowed.gameIsOver).toBe(true);
    expect(allowed.winnerSeatIndex()).toBe(2);
  });

  it('produces a redacted view that hides the opponent hand', () => {
    const host = SkipboHost.create({ activeSeatIndices: [2, 3] });
    const view = host.viewForSeat(3, ROOM);

    // Viewer (seat 3) is players[0]; opponent (seat 2) hand is hidden.
    expect(view.players[0].isHandVisible).toBe(true);
    expect(view.players[1].isHandVisible).toBe(false);
    expect(view.room.currentSeatIndex).toBe(2);
  });

  it('round-trips through a snapshot', () => {
    const host = SkipboHost.create({ activeSeatIndices: [2, 3] });
    host.applyMove(2, { type: 'SELECT_CARD', source: 'hand', index: 0 });

    const snapshot = host.serializeSnapshot();
    const restored = SkipboHost.fromSnapshot(snapshot, [2, 3]);

    expect(restored.currentSeatIndex()).toBe(host.currentSeatIndex());
    expect(restored.getState().selectedCard).not.toBeNull();
  });
});

describe('skipboActionSchema', () => {
  it('parses a PLAY_CARD move payload', () => {
    expect(skipboActionSchema.parse({ type: 'PLAY_CARD', buildPile: 1 })).toMatchObject({ type: 'PLAY_CARD' });
  });

  it('rejects an unknown action', () => {
    expect(() => skipboActionSchema.parse({ type: 'NONSENSE' })).toThrow();
  });
});
