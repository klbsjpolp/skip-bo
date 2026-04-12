import {
  RoomVersionConflictError,
} from '../repositories/types.js';
import type {
  ConnectionRecord,
  ConnectionRepository,
  RoomRecord,
  RoomRepository,
} from '../repositories/types.js';

export class InMemoryRoomRepository implements RoomRepository {
  private readonly rooms = new Map<string, RoomRecord>();

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

export class InMemoryConnectionRepository implements ConnectionRepository {
  private readonly connections = new Map<string, ConnectionRecord>();

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
