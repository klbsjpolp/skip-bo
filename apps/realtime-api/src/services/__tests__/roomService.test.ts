import { describe, expect, it } from 'vitest';

import { PROTOCOL_VERSION, ROOM_CODE_LENGTH, type ServerMessage } from '@skipbo/realtime-core';

import {
  RoomVersionConflictError,
  type ConnectionRecord,
  type ConnectionRepository,
  type RoomRecord,
  type RoomRepository,
} from '../../repositories/types.js';
import type { RealtimeBroadcaster } from '../broadcaster.js';
import {
  authenticateConnection,
  createRoom,
  DISCONNECT_GRACE_MS,
  handleDisconnect,
  handleEndGame,
  handleLeaveLobby,
  handleRelay,
  handleSetReady,
  handleSetTurn,
  handleSnapshot,
  joinRoom,
  rejectAction,
  startGame,
} from '../roomService.js';

class InMemoryRoomRepository implements RoomRepository {
  readonly rooms = new Map<string, RoomRecord>();

  async create(room: RoomRecord): Promise<void> {
    if (this.rooms.has(room.roomCode)) {
      throw new Error('duplicate');
    }

    this.rooms.set(room.roomCode, room);
  }

  async get(roomCode: string): Promise<RoomRecord | null> {
    return this.rooms.get(roomCode) ?? null;
  }

  async update(room: RoomRecord, expectedVersion?: number): Promise<void> {
    const currentRoom = this.rooms.get(room.roomCode);

    if (expectedVersion !== undefined && currentRoom && currentRoom.version !== expectedVersion) {
      throw new RoomVersionConflictError(room.roomCode);
    }

    this.rooms.set(room.roomCode, room);
  }
}

class InMemoryConnectionRepository implements ConnectionRepository {
  readonly connections = new Map<string, ConnectionRecord>();

  async delete(connectionId: string): Promise<void> {
    this.connections.delete(connectionId);
  }

  async get(connectionId: string): Promise<ConnectionRecord | null> {
    return this.connections.get(connectionId) ?? null;
  }

  async listByRoomCode(roomCode: string): Promise<ConnectionRecord[]> {
    return [...this.connections.values()].filter((connection) => connection.roomCode === roomCode);
  }

  async put(record: ConnectionRecord): Promise<void> {
    this.connections.set(record.connectionId, record);
  }
}

class FakeBroadcaster implements RealtimeBroadcaster {
  readonly sent: Array<{ connectionId: string; message: ServerMessage }> = [];
  readonly failureByConnectionId = new Map<string, unknown>();
  readonly disconnected: string[] = [];

  async disconnect(connectionId: string): Promise<void> {
    this.disconnected.push(connectionId);
  }

  async send(connectionId: string, message: ServerMessage): Promise<void> {
    const failure = this.failureByConnectionId.get(connectionId);

    if (failure !== undefined) {
      throw failure;
    }

    this.sent.push({ connectionId, message });
  }
}

const createDependencies = () => ({
  broadcaster: new FakeBroadcaster(),
  connectionRepository: new InMemoryConnectionRepository(),
  roomRepository: new InMemoryRoomRepository(),
  websocketUrl: 'wss://example.test/ws',
});

type Dependencies = ReturnType<typeof createDependencies>;

const auth = (
  dependencies: Dependencies,
  input: { connectionId: string; roomCode: string; seatIndex: number; seatToken: string },
) => authenticateConnection(dependencies, { ...input, protocolVersion: PROTOCOL_VERSION });

/** Create + join + auth two seats and start the game. Returns seat/connection mapping. */
const startTwoPlayerGame = async (dependencies: Dependencies) => {
  const created = await createRoom(dependencies);
  const joined = await joinRoom(dependencies, { roomCode: created.roomCode });

  await auth(dependencies, {
    connectionId: 'c-1',
    roomCode: created.roomCode,
    seatIndex: created.seatIndex,
    seatToken: created.seatToken,
  });
  await auth(dependencies, {
    connectionId: 'c-2',
    roomCode: joined.roomCode,
    seatIndex: joined.seatIndex,
    seatToken: joined.seatToken,
  });

  await handleSetReady(dependencies, { connectionId: 'c-1', playerName: 'Alice' });
  await handleSetReady(dependencies, { connectionId: 'c-2', playerName: 'Bob' });
  await startGame(dependencies, { connectionId: 'c-1' });

  const room = await dependencies.roomRepository.get(created.roomCode);
  if (!room) throw new Error('room missing after startGame');
  const currentSeat = room.currentSeatIndex!;
  const seatToConnection: Record<number, string> = {
    [created.seatIndex]: 'c-1',
    [joined.seatIndex]: 'c-2',
  };
  const idleSeat = room.activeSeatIndices!.find((seat) => seat !== currentSeat)!;

  return { created, joined, room, currentSeat, idleSeat, seatToConnection };
};

describe('roomService', () => {
  it('creates a room storing the opaque game id and config', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies, { gameId: 'skipbo', gameConfig: { stockSize: 35 } });
    const room = await dependencies.roomRepository.get(created.roomCode);

    expect(room?.gameId).toBe('skipbo');
    expect(room?.gameConfig).toEqual({ stockSize: 35 });
    expect(room?.status).toBe('WAITING');
    expect(room?.currentSeatIndex).toBeNull();
    expect(room?.seatCapacity).toBe(4);
    expect(room?.hostSeatIndex).toBe(0);
    expect(created.seatCapacity).toBe(4);
    expect(created.hostSeatIndex).toBe(0);
    expect(room?.lobbyPlayers?.[0]).toEqual({ seatIndex: 0, readyState: 'never-ready', playerName: null });
  });

  it('defaults the game id to skipbo', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);
    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.gameId).toBe('skipbo');
  });

  it('creates and joins a room until all four seats are reserved', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);
    const joined = await joinRoom(dependencies, { roomCode: created.roomCode.toLowerCase() });
    const joinedThird = await joinRoom(dependencies, { roomCode: created.roomCode });
    const joinedFourth = await joinRoom(dependencies, { roomCode: created.roomCode });

    expect(created.roomCode).toHaveLength(ROOM_CODE_LENGTH);
    expect(joined.seatIndex).toBe(1);
    expect(joinedThird.seatIndex).toBe(2);
    expect(joinedFourth.seatIndex).toBe(3);
    await expect(joinRoom(dependencies, { roomCode: created.roomCode })).rejects.toThrow('Room is full');
  });

  it('rejects authentication when the client protocol version is too old', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);

    await expect(
      authenticateConnection(dependencies, {
        connectionId: 'c-old',
        protocolVersion: 1,
        roomCode: created.roomCode,
        seatIndex: created.seatIndex,
        seatToken: created.seatToken,
      }),
    ).rejects.toThrow(/protocol version/i);
  });

  it('authenticates seats and broadcasts presence with the abstract turn pointer', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);
    const joined = await joinRoom(dependencies, { roomCode: created.roomCode });

    await auth(dependencies, {
      connectionId: 'c-1',
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });
    await auth(dependencies, {
      connectionId: 'c-2',
      roomCode: joined.roomCode,
      seatIndex: joined.seatIndex,
      seatToken: joined.seatToken,
    });

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.status).toBe('WAITING');
    expect(room?.authenticatedSeats).toEqual([0, 1]);

    const presence = dependencies.broadcaster.sent.filter((entry) => entry.message.type === 'presence').at(-1);
    expect(presence?.message.type).toBe('presence');
    if (presence?.message.type === 'presence') {
      expect(presence.message.room.currentSeatIndex).toBeNull();
    }
  });

  it('sends the host its snapshot on (re)authentication', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);

    await auth(dependencies, {
      connectionId: 'c-1',
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });

    const restore = dependencies.broadcaster.sent.find(
      (entry) => entry.connectionId === 'c-1' && entry.message.type === 'snapshotRestore',
    );
    expect(restore?.message.type).toBe('snapshotRestore');
    if (restore?.message.type === 'snapshotRestore') {
      expect(restore.message.payload).toBeNull();
    }
  });

  it('starts the game, shuffles seats and announces gameStarted', async () => {
    const dependencies = createDependencies();
    const { room } = await startTwoPlayerGame(dependencies);

    expect(room.status).toBe('ACTIVE');
    expect(room.activeSeatIndices).toEqual(expect.arrayContaining([0, 1]));
    expect(room.activeSeatIndices).toHaveLength(2);
    expect([0, 1]).toContain(room.currentSeatIndex);

    const started = dependencies.broadcaster.sent.filter((entry) => entry.message.type === 'gameStarted');
    expect(started.length).toBeGreaterThan(0);
    if (started[0]?.message.type === 'gameStarted') {
      expect(started[0].message.activeSeatIndices).toEqual(room.activeSeatIndices);
      expect(started[0].message.currentSeatIndex).toBe(room.currentSeatIndex);
    }
  });

  it('requires the host and at least two ready players to start', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);

    await auth(dependencies, {
      connectionId: 'c-1',
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });

    await expect(startGame(dependencies, { connectionId: 'c-1' })).rejects.toThrow(
      'Tous les joueurs doivent être prêts pour démarrer',
    );

    const joined = await joinRoom(dependencies, { roomCode: created.roomCode });
    await auth(dependencies, {
      connectionId: 'c-2',
      roomCode: joined.roomCode,
      seatIndex: joined.seatIndex,
      seatToken: joined.seatToken,
    });
    await handleSetReady(dependencies, { connectionId: 'c-1' });
    await handleSetReady(dependencies, { connectionId: 'c-2' });

    await expect(startGame(dependencies, { connectionId: 'c-2' })).rejects.toThrow('Only the host can start the room');
  });

  it('relays an opaque move from the current seat to the other seats', async () => {
    const dependencies = createDependencies();
    const { currentSeat, idleSeat, seatToConnection } = await startTwoPlayerGame(dependencies);

    await handleRelay(dependencies, {
      connectionId: seatToConnection[currentSeat],
      kind: 'move',
      payload: { type: 'SELECT_CARD', source: 'hand', index: 0 },
    });

    const relayed = dependencies.broadcaster.sent.filter(
      (entry) => entry.connectionId === seatToConnection[idleSeat] && entry.message.type === 'relayed',
    );
    expect(relayed.length).toBe(1);
    if (relayed[0]?.message.type === 'relayed') {
      expect(relayed[0].message.fromSeat).toBe(currentSeat);
      expect(relayed[0].message.payload).toEqual({ type: 'SELECT_CARD', source: 'hand', index: 0 });
    }
  });

  it('rejects a move from a seat whose turn it is not', async () => {
    const dependencies = createDependencies();
    const { idleSeat, seatToConnection } = await startTwoPlayerGame(dependencies);

    await expect(
      handleRelay(dependencies, {
        connectionId: seatToConnection[idleSeat],
        kind: 'move',
        payload: { type: 'END_TURN' },
      }),
    ).rejects.toThrow('It is not your turn');
  });

  it('only lets the host push a view', async () => {
    const dependencies = createDependencies();
    const { created, idleSeat, currentSeat, seatToConnection } = await startTwoPlayerGame(dependencies);
    const nonHostSeat = created.hostSeatIndex === currentSeat ? idleSeat : currentSeat;

    await expect(
      handleRelay(dependencies, {
        connectionId: seatToConnection[nonHostSeat],
        kind: 'view',
        payload: { redacted: true },
      }),
    ).rejects.toThrow('Only the host can push a view');
  });

  it('advances the abstract turn on the host setTurn and broadcasts it', async () => {
    const dependencies = createDependencies();
    const { created, idleSeat } = await startTwoPlayerGame(dependencies);

    await handleSetTurn(dependencies, { connectionId: 'c-1', currentSeatIndex: idleSeat });

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.currentSeatIndex).toBe(idleSeat);

    const turn = dependencies.broadcaster.sent.filter((entry) => entry.message.type === 'turn').at(-1);
    if (turn?.message.type === 'turn') {
      expect(turn.message.currentSeatIndex).toBe(idleSeat);
    }
  });

  it('stores the host snapshot and replays it on host re-authentication', async () => {
    const dependencies = createDependencies();
    const { created } = await startTwoPlayerGame(dependencies);

    await handleSnapshot(dependencies, { connectionId: 'c-1', payload: { deck: ['secret'] } });

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.hostSnapshot?.payload).toEqual({ deck: ['secret'] });

    await handleDisconnect(dependencies, 'c-1');
    await auth(dependencies, {
      connectionId: 'c-1-resumed',
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });

    const restore = dependencies.broadcaster.sent.find(
      (entry) => entry.connectionId === 'c-1-resumed' && entry.message.type === 'snapshotRestore',
    );
    if (restore?.message.type === 'snapshotRestore') {
      expect(restore.message.payload).toEqual({ deck: ['secret'] });
    }
  });

  it('rejects a snapshot from a non-host seat', async () => {
    const dependencies = createDependencies();
    const { idleSeat, currentSeat, created, seatToConnection } = await startTwoPlayerGame(dependencies);
    const nonHostSeat = created.hostSeatIndex === currentSeat ? idleSeat : currentSeat;

    await expect(
      handleSnapshot(dependencies, { connectionId: seatToConnection[nonHostSeat], payload: { x: 1 } }),
    ).rejects.toThrow('Only the host can store a snapshot');
  });

  it('ends the game on host endGame, clearing disconnects and closing the room', async () => {
    const dependencies = createDependencies();
    const { created } = await startTwoPlayerGame(dependencies);

    // Disconnect the guest (c-2 / seat 1 is never the host) so the host (c-1)
    // remains connected to send endGame.
    await handleDisconnect(dependencies, 'c-2');
    await handleEndGame(dependencies, { connectionId: 'c-1', winnerSeatIndex: created.hostSeatIndex });

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.status).toBe('FINISHED');
    expect(room?.currentSeatIndex).toBeNull();
    expect(room?.summary?.winnerSeatIndex).toBe(created.hostSeatIndex);
    expect(room?.disconnectedSeats).toEqual({});

    const closed = dependencies.broadcaster.sent.filter((entry) => entry.message.type === 'roomClosed');
    expect(closed.length).toBeGreaterThan(0);
  });

  it('marks a disconnected seat with a grace timestamp instead of removing it', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);
    const joined = await joinRoom(dependencies, { roomCode: created.roomCode });

    await auth(dependencies, {
      connectionId: 'c-1',
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });
    await auth(dependencies, {
      connectionId: 'c-2',
      roomCode: joined.roomCode,
      seatIndex: joined.seatIndex,
      seatToken: joined.seatToken,
    });

    await handleDisconnect(dependencies, 'c-2');

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.authenticatedSeats).toEqual([0, 1]);
    expect(room?.disconnectedSeats?.['1']?.disconnectedAt).toBeTypeOf('string');

    const presenceMessage = dependencies.broadcaster.sent.filter((entry) => entry.message.type === 'presence').at(-1);
    if (presenceMessage?.message.type === 'presence') {
      expect(presenceMessage.message.room.disconnectedSeats).toEqual([
        { seatIndex: 1, disconnectedAt: expect.any(String) },
      ]);
    }
  });

  it('clears the disconnect entry when the seat re-authenticates within the grace window', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);
    const joined = await joinRoom(dependencies, { roomCode: created.roomCode });

    await auth(dependencies, {
      connectionId: 'c-1',
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });
    await auth(dependencies, {
      connectionId: 'c-2',
      roomCode: joined.roomCode,
      seatIndex: joined.seatIndex,
      seatToken: joined.seatToken,
    });

    await handleDisconnect(dependencies, 'c-2');
    await auth(dependencies, {
      connectionId: 'c-2-resumed',
      roomCode: joined.roomCode,
      seatIndex: joined.seatIndex,
      seatToken: joined.seatToken,
    });

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.authenticatedSeats).toEqual([0, 1]);
    expect(room?.disconnectedSeats?.['1']).toBeUndefined();
  });

  it('prunes stale disconnect entries when a seat re-authenticates after the grace period', async () => {
    const dependencies = createDependencies();
    const { created, joined } = await startTwoPlayerGame(dependencies);
    // joined (seat 1) is never the host; disconnect it and let its grace expire.
    const staleSeat = joined.seatIndex;

    await handleDisconnect(dependencies, 'c-2');

    const beforePrune = await dependencies.roomRepository.get(created.roomCode);
    if (!beforePrune) throw new Error('room missing');
    const expiredAt = new Date(Date.now() - DISCONNECT_GRACE_MS - 1_000).toISOString();
    await dependencies.roomRepository.update({
      ...beforePrune,
      disconnectedSeats: { [String(staleSeat)]: { disconnectedAt: expiredAt } },
    });

    // The host re-authenticates, which prunes expired disconnects.
    await auth(dependencies, {
      connectionId: 'c-1-resumed',
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.authenticatedSeats).not.toContain(staleSeat);
    expect(room?.disconnectedSeats?.[String(staleSeat)]).toBeUndefined();
  });

  it('removes the seat immediately when leaving the lobby intentionally', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);
    const joined = await joinRoom(dependencies, { roomCode: created.roomCode });

    await auth(dependencies, {
      connectionId: 'c-1',
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });
    await auth(dependencies, {
      connectionId: 'c-2',
      roomCode: joined.roomCode,
      seatIndex: joined.seatIndex,
      seatToken: joined.seatToken,
    });

    await handleLeaveLobby(dependencies, { connectionId: 'c-2' });

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.authenticatedSeats).toEqual([0]);
    expect(room?.disconnectedSeats?.['1']).toBeUndefined();
  });

  it('closes the room when the host disconnects during WAITING regardless of grace', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);
    const joined = await joinRoom(dependencies, { roomCode: created.roomCode });

    await auth(dependencies, {
      connectionId: 'c-1',
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });
    await auth(dependencies, {
      connectionId: 'c-2',
      roomCode: joined.roomCode,
      seatIndex: joined.seatIndex,
      seatToken: joined.seatToken,
    });

    await handleDisconnect(dependencies, 'c-1');

    const closeMessages = dependencies.broadcaster.sent.filter(
      (entry) => entry.message.type === 'roomClosed' && entry.connectionId === 'c-2',
    );
    expect(closeMessages.length).toBeGreaterThan(0);
  });

  it('keeps the host seat (grace) when it disconnects during an ACTIVE game', async () => {
    const dependencies = createDependencies();
    const { created } = await startTwoPlayerGame(dependencies);

    await handleDisconnect(dependencies, 'c-1');

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.status).toBe('ACTIVE');
    expect(room?.authenticatedSeats).toContain(created.hostSeatIndex);
    expect(room?.disconnectedSeats?.[String(created.hostSeatIndex)]?.disconnectedAt).toBeTypeOf('string');
  });

  it('drops a stale connection when rejecting an action to a closed socket', async () => {
    const dependencies = createDependencies();
    await dependencies.connectionRepository.put({
      connectedAt: new Date('2026-04-08T22:25:45.000Z').toISOString(),
      connectionId: 'gone-connection',
      roomCode: 'ABC',
      seatIndex: 0,
      updatedAt: new Date('2026-04-08T22:25:45.000Z').toISOString(),
    });

    dependencies.broadcaster.failureByConnectionId.set('gone-connection', {
      $metadata: { httpStatusCode: 410 },
      name: 'GoneException',
    });

    await expect(rejectAction(dependencies, 'gone-connection', 'Invalid action')).resolves.toBeUndefined();
    await expect(dependencies.connectionRepository.get('gone-connection')).resolves.toBeNull();
  });

  it('still surfaces non-stale broadcaster failures while rejecting an action', async () => {
    const dependencies = createDependencies();
    dependencies.broadcaster.failureByConnectionId.set('c-1', new Error('transport offline'));

    await expect(rejectAction(dependencies, 'c-1', 'Invalid action')).rejects.toThrow('transport offline');
  });
});
