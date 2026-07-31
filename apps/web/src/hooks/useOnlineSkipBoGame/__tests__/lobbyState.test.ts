import { describe, expect, it } from 'vitest';

import type { CreateRoomResponse, LobbySeatInfo, RoomSummary } from '@klbsjpolp/realtime-core';
import type { ClientGameView } from '@skipbo/skipbo-runtime';

import {
  canStartGame,
  collectSeatDisplayNames,
  deriveLobbyState,
  selectRoomSummary,
} from '@/hooks/useOnlineSkipBoGame/lobbyState';

const seat = (seatIndex: number, readyState: LobbySeatInfo['readyState'], displayName: string | null = null) => ({
  seatIndex,
  readyState,
  displayName,
});

const makeRoom = (overrides: Partial<RoomSummary> = {}): RoomSummary => ({
  connectedSeats: [0, 1],
  currentSeatIndex: null,
  disconnectedSeats: [],
  expiresAt: '2026-01-01T00:00:00.000Z',
  hostSeatIndex: 0,
  lobbySeats: [seat(0, 'ready', 'Host'), seat(1, 'ready', 'Guest')],
  roomCode: 'ABCD',
  seatCapacity: 4,
  status: 'WAITING',
  version: 1,
  ...overrides,
});

const makeSession = (overrides: Partial<CreateRoomResponse> = {}): CreateRoomResponse =>
  ({
    roomCode: 'ABCD',
    seatIndex: 0,
    hostSeatIndex: 0,
    seatCapacity: 4,
    ...overrides,
  }) as CreateRoomResponse;

const makeView = (room: RoomSummary, players: ClientGameView['players'] = []): ClientGameView =>
  ({ room, players }) as ClientGameView;

describe('selectRoomSummary', () => {
  it('prefers the game view room over the presence summary', () => {
    const view = makeView(makeRoom({ version: 9 }));
    const stalePresence = makeRoom({ version: 2 });

    expect(selectRoomSummary(view, stalePresence, makeSession())?.version).toBe(9);
  });

  it('falls back to the presence summary while there is no view (WAITING)', () => {
    const presence = makeRoom({ roomCode: 'ABCD' });

    expect(selectRoomSummary(null, presence, makeSession())).toBe(presence);
  });

  it('ignores a summary left over from a previous room', () => {
    const previousRoom = makeRoom({ roomCode: 'OLDX' });

    expect(selectRoomSummary(null, previousRoom, makeSession({ roomCode: 'ABCD' }))).toBeNull();
  });

  it('returns null when there is neither a view nor a summary', () => {
    expect(selectRoomSummary(null, null, makeSession())).toBeNull();
  });
});

describe('collectSeatDisplayNames', () => {
  it('prefers in-game player names over lobby seat names', () => {
    const room = makeRoom({ lobbySeats: [seat(0, 'ready', 'Lobby name')] });
    const view = makeView(room, [{ seatIndex: 0, displayName: 'In-game name' }] as ClientGameView['players']);

    expect(collectSeatDisplayNames(view, room)[0]).toEqual({ displayName: 'In-game name', seatIndex: 0 });
  });

  it('falls back to lobby seats for seats absent from the player list', () => {
    const room = makeRoom({ lobbySeats: [seat(0, 'ready', 'Host'), seat(3, 'never-ready', 'Latecomer')] });
    const view = makeView(room, [{ seatIndex: 0, displayName: 'Host' }] as ClientGameView['players']);

    expect(collectSeatDisplayNames(view, room)[3]).toEqual({ displayName: 'Latecomer', seatIndex: 3 });
  });

  it('skips lobby seats that have no display name yet', () => {
    const room = makeRoom({ lobbySeats: [seat(1, 'never-ready', null)] });

    expect(collectSeatDisplayNames(null, room)).toEqual({});
  });

  it('returns an empty map with no view and no room', () => {
    expect(collectSeatDisplayNames(null, null)).toEqual({});
  });
});

describe('canStartGame', () => {
  const bothReady = [seat(0, 'ready'), seat(1, 'ready')];

  it('allows the host to start once every connected seat is ready', () => {
    expect(canStartGame(true, 'WAITING', [0, 1], bothReady)).toBe(true);
  });

  it('refuses for a non-host seat', () => {
    expect(canStartGame(false, 'WAITING', [0, 1], bothReady)).toBe(false);
  });

  it('refuses once the room is no longer WAITING', () => {
    expect(canStartGame(true, 'ACTIVE', [0, 1], bothReady)).toBe(false);
  });

  it('refuses with fewer than two connected seats', () => {
    expect(canStartGame(true, 'WAITING', [0], [seat(0, 'ready')])).toBe(false);
  });

  it('refuses while any connected seat is not ready', () => {
    expect(canStartGame(true, 'WAITING', [0, 1], [seat(0, 'ready'), seat(1, 'unready')])).toBe(false);
  });

  it('ignores the ready state of seats that are not connected', () => {
    const seats = [seat(0, 'ready'), seat(1, 'ready'), seat(2, 'never-ready')];

    expect(canStartGame(true, 'WAITING', [0, 1], seats)).toBe(true);
  });

  it('refuses when a connected seat has no lobby entry at all', () => {
    expect(canStartGame(true, 'WAITING', [0, 1], [seat(0, 'ready')])).toBe(false);
  });
});

describe('deriveLobbyState', () => {
  it('derives the full lobby state from a view', () => {
    const room = makeRoom({ status: 'ACTIVE', connectedSeats: [0, 1], seatCapacity: 3 });
    const view = makeView(room, [{ seatIndex: 1, displayName: 'Guest' }] as ClientGameView['players']);

    const state = deriveLobbyState(view, null, makeSession({ seatIndex: 1 }));

    expect(state).toMatchObject({
      canStartGame: false,
      connectedSeats: [0, 1],
      hostSeatIndex: 0,
      isLocalHost: false,
      myReadyState: 'ready',
      roomCode: 'ABCD',
      roomStatus: 'ACTIVE',
      seatCapacity: 3,
    });
    expect(state.playersBySeatIndex[1]).toEqual({ displayName: 'Guest', seatIndex: 1 });
  });

  it('falls back to session values when no room is available yet', () => {
    const state = deriveLobbyState(null, null, makeSession({ hostSeatIndex: 2, seatCapacity: 6, roomCode: 'ZZZZ' }));

    expect(state).toMatchObject({
      canStartGame: false,
      connectedSeats: [],
      disconnectedSeats: [],
      hostSeatIndex: 2,
      isLocalHost: false,
      lobbySeats: [],
      myReadyState: 'never-ready',
      roomCode: 'ZZZZ',
      roomStatus: 'WAITING',
      seatCapacity: 6,
    });
  });

  it('defaults to seat capacity 4 and host seat 0 with no session at all', () => {
    const state = deriveLobbyState(null, null, null);

    expect(state).toMatchObject({ hostSeatIndex: 0, isLocalHost: false, roomCode: '', seatCapacity: 4 });
  });

  it('marks the local seat as host and lets it start a ready WAITING room', () => {
    const state = deriveLobbyState(null, makeRoom(), makeSession({ seatIndex: 0 }));

    expect(state.isLocalHost).toBe(true);
    expect(state.canStartGame).toBe(true);
  });

  it('reports the local seat ready state, not another seat’s', () => {
    const room = makeRoom({ lobbySeats: [seat(0, 'ready', 'Host'), seat(1, 'unready', 'Guest')] });

    expect(deriveLobbyState(null, room, makeSession({ seatIndex: 1 })).myReadyState).toBe('unready');
  });

  it('passes disconnected seats through', () => {
    const room = makeRoom({ disconnectedSeats: [{ seatIndex: 1, disconnectedAt: '2026-01-01T00:00:00.000Z' }] });

    expect(deriveLobbyState(null, room, makeSession()).disconnectedSeats).toHaveLength(1);
  });
});
