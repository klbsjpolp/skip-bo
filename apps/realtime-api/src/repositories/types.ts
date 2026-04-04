import type { GameState } from '@skipbo/game-core';
import type { RoomStatus } from '@skipbo/multiplayer-protocol';

export interface RoomSummaryRecord {
  finishedAt: string;
  winnerIndex: number | null;
}

export interface RoomRecord {
  authenticatedSeats?: number[];
  createdAt: string;
  expiresAt: number;
  roomCode: string;
  seatTokenHashes: [string, string | null];
  state: GameState;
  status: RoomStatus;
  summary: RoomSummaryRecord | null;
  updatedAt: string;
  version: number;
}

export interface ConnectionRecord {
  connectedAt: string;
  connectionId: string;
  roomCode: string;
  seatIndex: number;
  updatedAt: string;
}

export interface RoomRepository {
  create(room: RoomRecord): Promise<void>;
  get(roomCode: string): Promise<RoomRecord | null>;
  update(room: RoomRecord): Promise<void>;
}

export interface ConnectionRepository {
  delete(connectionId: string): Promise<void>;
  get(connectionId: string): Promise<ConnectionRecord | null>;
  listByRoomCode(roomCode: string): Promise<ConnectionRecord[]>;
  put(record: ConnectionRecord): Promise<void>;
}
