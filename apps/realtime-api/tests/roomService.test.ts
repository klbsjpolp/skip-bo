import { describe, expect, it } from 'vitest';

import type { ServerMessage } from '@skipbo/multiplayer-protocol';

import type { ConnectionRecord, ConnectionRepository, RoomRecord, RoomRepository } from '../src/repositories/types.js';
import type { RealtimeBroadcaster } from '../src/services/broadcaster.js';
import { authenticateConnection, createRoom, handleAction, joinRoom } from '../src/services/roomService.js';

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

  async update(room: RoomRecord): Promise<void> {
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

class FakeBroadcaster implements RealtimeBroadcaster {
  readonly sent: Array<{ connectionId: string; message: ServerMessage }> = [];

  async send(connectionId: string, message: ServerMessage): Promise<void> {
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

describe('roomService', () => {
  it('creates a room with the requested stock size', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies, { stockSize: 35 });
    const room = await dependencies.roomRepository.get(created.roomCode);

    expect(room?.state.config.STOCK_SIZE).toBe(35);
    expect(room?.state.players[0].stockPile).toHaveLength(35);
    expect(room?.state.players[1].stockPile).toHaveLength(35);
  });

  it('creates and joins a room', async () => {
    const dependencies = createDependencies();
    const created = await createRoom(dependencies);
    const joined = await joinRoom(dependencies, { roomCode: created.roomCode.toLowerCase() });

    expect(created.roomCode).toHaveLength(5);
    expect(joined.roomCode).toBe(created.roomCode);
    expect(joined.seatIndex).toBe(1);
  });

  it('activates the room after both seats authenticate and accepts a selection action', async () => {
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

    await handleAction(dependencies, {
      action: { type: 'SELECT_CARD', source: 'hand', index: 0 },
      connectionId: 'c-1',
    });

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.status).toBe('ACTIVE');
    expect(room?.authenticatedSeats).toEqual([0, 1]);
    expect(room?.state.selectedCard?.source).toBe('hand');
  });

  it('activates the room even if the room connection query is stale during second auth', async () => {
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

    await handleAction(dependencies, {
      action: { type: 'SELECT_CARD', source: 'hand', index: 0 },
      connectionId: 'c-1',
    });

    const room = await dependencies.roomRepository.get(created.roomCode);
    expect(room?.status).toBe('ACTIVE');
    expect(room?.authenticatedSeats).toEqual([0, 1]);
    expect(room?.state.selectedCard?.source).toBe('hand');
  });
});
