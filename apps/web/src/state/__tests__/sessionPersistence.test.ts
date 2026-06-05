import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CreateRoomResponse } from '@skipbo/realtime-core';

import { clearOnlineSession, loadOnlineSession, saveOnlineSession } from '@/state/sessionPersistence';

const validSession: CreateRoomResponse = {
  expiresAt: new Date('2099-01-01T00:00:00.000Z').toISOString(),
  hostSeatIndex: 0,
  roomCode: 'ABC',
  seatCapacity: 4,
  seatIndex: 1,
  seatToken: 'token-xyz',
  wsUrl: 'wss://example.test/ws',
};

describe('sessionPersistence', () => {
  beforeEach(() => {
    localStorage.removeItem('skipbo_online_session');
  });

  afterEach(() => {
    localStorage.removeItem('skipbo_online_session');
  });

  it('returns null when nothing has been persisted', () => {
    expect(loadOnlineSession()).toBeNull();
  });

  it('round-trips a saved session', () => {
    saveOnlineSession(validSession);
    expect(loadOnlineSession()).toEqual(validSession);
  });

  it('discards an expired session and clears it from storage', () => {
    const expired = { ...validSession, expiresAt: new Date('2020-01-01T00:00:00.000Z').toISOString() };
    saveOnlineSession(expired);

    expect(loadOnlineSession()).toBeNull();
    expect(localStorage.getItem('skipbo_online_session')).toBeNull();
  });

  it('discards malformed payloads', () => {
    localStorage.setItem('skipbo_online_session', '{"version":1,"session":{"roomCode":"OOPS"}}');
    expect(loadOnlineSession()).toBeNull();
  });

  it('clears the session on demand', () => {
    saveOnlineSession(validSession);
    clearOnlineSession();
    expect(loadOnlineSession()).toBeNull();
  });
});
