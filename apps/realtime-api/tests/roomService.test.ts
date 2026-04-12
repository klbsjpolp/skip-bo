import { describe, expect, it } from 'vitest';

import type { ServerMessage } from '@skipbo/multiplayer-protocol';

import { RoomVersionConflictError, type ConnectionRecord, type ConnectionRepository, type RoomRecord, type RoomRepository } from '../src/repositories/types.js';
import type { RealtimeBroadcaster } from '../src/services/broadcaster.js';
import { authenticateConnection, createRoom, handleAction, handleDisconnect, joinRoom, rejectAction, startGame } from '../src/services/roomService.js';

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

class EventuallyConsistentConnectionRepository extends InMemoryConnectionRepository {
  private staleRoomCode: string | null = null;

  override async listByRoomCode(roomCode: string): Promise<ConnectionRecord[]> {
    const connections = await super.listByRoomCode(roomCode);

    if (this.staleRoomCode === roomCode) {
      this.staleRoomCode = null;
      return connections.filter((connection) => connection.seatIndex === 0);
    }

    return connections;
  }

  override async put(record: ConnectionRecord): Promise<void> {
    await super.put(record);

    if (record.seatIndex === 1) {
      this.staleRoomCode = record.roomCode;
    }
  }
}

class PersistentlyStaleConnectionRepository extends InMemoryConnectionRepository {
  override async listByRoomCode(roomCode: string): Promise<ConnectionRecord[]> {
    const connections = await super.listByRoomCode(roomCode);

    return connections.filter((connection) => connection.seatIndex === 0);
  }
}

class ConcurrentAuthRoomRepository extends InMemoryRoomRepository {
  private raceBarrierEnabled = false;
  private gatePromise: Promise<void> | null = null;
  private releaseGate: (() => void) | null = null;
  private gatedGets = 0;

  enableConcurrentAuthRace(): void {
    this.raceBarrierEnabled = true;
    this.gatePromise = null;
    this.releaseGate = null;
    this.gatedGets = 0;
  }

  override async get(roomCode: string): Promise<RoomRecord | null> {
    const room = await super.get(roomCode);

    if (!this.raceBarrierEnabled || !room || room.status !== 'WAITING' || room.authenticatedSeats?.length) {
      return room;
    }

    if (!this.gatePromise) {
      this.gatePromise = new Promise<void>((resolve) => {
        this.releaseGate = resolve;
      });
    }

    this.gatedGets += 1;
    if (this.gatedGets === 2) {
      this.releaseGate?.();
    }

    await this.gatePromise;
    return room ? { ...room, authenticatedSeats: [...(room.authenticatedSeats ?? [])] } : room;
  }
}

class FakeBroadcaster implements RealtimeBroadcaster {
  readonly sent: Array<{ connectionId: string; message: ServerMessage }> = [];
  readonly failureByConnectionId = new Map<string, unknown>();

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

const createEventuallyConsistentDependencies = () => ({
  broadcaster: new FakeBroadcaster(),
  connectionRepository: new EventuallyConsistentConnectionRepository(),
  roomRepository: new InMemoryRoomRepository(),
  websocketUrl: 'wss://example.test/ws',
});

const createPersistentlyStaleDependencies = () => ({
  broadcaster: new FakeBroadcaster(),
  connectionRepository: new PersistentlyStaleConnectionRepository(),
  roomRepository: new InMemoryRoomRepository(),
  websocketUrl: 'wss://example.test/ws',
});

const createConcurrentAuthDependencies = () => ({
  broadcaster: new FakeBroadcaster(),
  connectionRepository: new InMemoryConnectionRepository(),
  roomRepository: new ConcurrentAuthRoomRepository(),
  websocketUrl: 'wss://example.test/ws',
});

describe('roomService', () => {
  it('creates a room with the requested stock size', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies, { playerName: 'Alice', stockSize: 35 });
    const room = await dependencies.roomRepository.get(created.roomCode);

    expect(room?.state.config.STOCK_SIZE).toBe(35);
    expect(room?.status).toBe('WAITING');
    expect(room?.seatCapacity).toBe(4);
    expect(room?.hostSeatIndex).toBe(0);
    expect(created.seatCapacity).toBe(4);
    expect(created.hostSeatIndex).toBe(0);
    expect(room?.state.players).toHaveLength(4);
    expect(room?.state.players[0].name).toBe('Alice');
    expect(room?.state.players[1].name).toBe('Joueur 2');
    expect(room?.state.players[0].stockPile).toHaveLength(0);
    expect(room?.state.players[0].hand.filter((card) => card !== null)).toHaveLength(5);
  });

  it('creates and joins a room until all four seats are reserved', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);
    const joined = await joinRoom(dependencies, { playerName: 'Bob', roomCode: created.roomCode.toLowerCase() });
    const joinedThird = await joinRoom(dependencies, { roomCode: created.roomCode });
    const joinedFourth = await joinRoom(dependencies, { roomCode: created.roomCode });
    const room = await dependencies.roomRepository.get(created.roomCode);

    expect(created.roomCode).toHaveLength(5);
    expect(joined.roomCode).toBe(created.roomCode);
    expect(joined.seatIndex).toBe(1);
    expect(joinedThird.seatIndex).toBe(2);
    expect(joinedFourth.seatIndex).toBe(3);
    expect(room?.state.players[1].name).toBe('Bob');
    expect(room?.state.players[2].name).toBe('Joueur 3');
    await expect(joinRoom(dependencies, { roomCode: created.roomCode })).rejects.toThrow('Room is full');
  });

  it('waits for an explicit host start before accepting actions', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);
    const joined = await joinRoom(dependencies, { roomCode: created.roomCode });

    await authenticateConnection(dependencies, {
      connectionId: 'c-1',
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });
    await authenticateConnection(dependencies, {
      connectionId: 'c-2',
      roomCode: joined.roomCode,
      seatIndex: joined.seatIndex,
      seatToken: joined.seatToken,
    });

    let room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.status).toBe('WAITING');
    expect(room?.authenticatedSeats).toEqual([0, 1]);

    await startGame(dependencies, {
      connectionId: 'c-1',
    });

    await handleAction(dependencies, {
      action: { type: 'SELECT_CARD', source: 'hand', index: 0 },
      connectionId: 'c-1',
    });

    room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.status).toBe('ACTIVE');
    expect(room?.activeSeatIndices).toEqual([0, 1]);
    expect(room?.authenticatedSeats).toEqual([0, 1]);
    expect(room?.state.players[0].name).toBe('Joueur 1');
    expect(room?.state.players[1].name).toBe('Joueur 2');
    expect(room?.state.selectedCard?.source).toBe('hand');
    expect(room?.state.players).toHaveLength(2);
  });

  it('starts the room even if the room connection query is stale during second auth', async () => {
    const dependencies = createEventuallyConsistentDependencies();
    const created = await createRoom(dependencies);
    const joined = await joinRoom(dependencies, { roomCode: created.roomCode });

    await authenticateConnection(dependencies, {
      connectionId: 'c-1',
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });
    await authenticateConnection(dependencies, {
      connectionId: 'c-2',
      roomCode: joined.roomCode,
      seatIndex: joined.seatIndex,
      seatToken: joined.seatToken,
    });

    await startGame(dependencies, {
      connectionId: 'c-1',
    });

    await handleAction(dependencies, {
      action: { type: 'SELECT_CARD', source: 'hand', index: 0 },
      connectionId: 'c-1',
    });

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.status).toBe('ACTIVE');
    expect(room?.activeSeatIndices).toEqual([0, 1]);
    expect(room?.authenticatedSeats).toEqual([0, 1]);
    expect(room?.state.selectedCard?.source).toBe('hand');
  });

  it('starts the room from authenticated seats even when the live connection query remains stale', async () => {
    const dependencies = createPersistentlyStaleDependencies();
    const created = await createRoom(dependencies);
    const joined = await joinRoom(dependencies, { roomCode: created.roomCode });

    await authenticateConnection(dependencies, {
      connectionId: 'c-1',
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });
    await authenticateConnection(dependencies, {
      connectionId: 'c-2',
      roomCode: joined.roomCode,
      seatIndex: joined.seatIndex,
      seatToken: joined.seatToken,
    });

    await startGame(dependencies, {
      connectionId: 'c-1',
    });

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.status).toBe('ACTIVE');
    expect(room?.activeSeatIndices).toEqual([0, 1]);
    expect(room?.authenticatedSeats).toEqual([0, 1]);
    expect(room?.state.players).toHaveLength(2);
  });

  it('keeps both authenticated seats when two auths race on the same room version', async () => {
    const dependencies = createConcurrentAuthDependencies();
    const created = await createRoom(dependencies);
    const joined = await joinRoom(dependencies, { roomCode: created.roomCode });
    dependencies.roomRepository.enableConcurrentAuthRace();

    await Promise.all([
      authenticateConnection(dependencies, {
        connectionId: 'c-1',
        roomCode: created.roomCode,
        seatIndex: created.seatIndex,
        seatToken: created.seatToken,
      }),
      authenticateConnection(dependencies, {
        connectionId: 'c-2',
        roomCode: joined.roomCode,
        seatIndex: joined.seatIndex,
        seatToken: joined.seatToken,
      }),
    ]);

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.authenticatedSeats).toEqual([0, 1]);
  });

  it('requires the host and at least two connected players to start', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);

    await authenticateConnection(dependencies, {
      connectionId: 'c-1',
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });

    await expect(startGame(dependencies, {
      connectionId: 'c-1',
    })).rejects.toThrow('At least two connected players are required to start');

    const joined = await joinRoom(dependencies, { roomCode: created.roomCode });
    await authenticateConnection(dependencies, {
      connectionId: 'c-2',
      roomCode: joined.roomCode,
      seatIndex: joined.seatIndex,
      seatToken: joined.seatToken,
    });

    await expect(startGame(dependencies, {
      connectionId: 'c-2',
    })).rejects.toThrow('Only the host can start the room');
  });

  it('removes a disconnected seat from authenticated seats', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);
    const joined = await joinRoom(dependencies, { roomCode: created.roomCode });

    await authenticateConnection(dependencies, {
      connectionId: 'c-1',
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });
    await authenticateConnection(dependencies, {
      connectionId: 'c-2',
      roomCode: joined.roomCode,
      seatIndex: joined.seatIndex,
      seatToken: joined.seatToken,
    });

    await handleDisconnect(dependencies, 'c-2');

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.authenticatedSeats).toEqual([0]);
  });

  it('drops a stale connection when rejecting an action to a closed socket', async () => {
    const dependencies = createDependencies();
    await dependencies.connectionRepository.put({
      connectedAt: new Date('2026-04-08T22:25:45.000Z').toISOString(),
      connectionId: 'gone-connection',
      roomCode: 'ABCDE',
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
