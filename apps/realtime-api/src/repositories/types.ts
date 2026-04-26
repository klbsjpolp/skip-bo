import type { GameState } from '@skipbo/game-core';
import type { RoomStatus } from '@skipbo/multiplayer-protocol';

export class RoomVersionConflictError extends Error {
  constructor(roomCode: string) {
    super(`Room version conflict for ${roomCode}`);
    this.name = 'RoomVersionConflictError';
  }
}

export interface RoomSummaryRecord {
  finishedAt: string;
  winnerIndex: number | null;
}

export interface LobbyPlayerRecord {
  seatIndex: number;
  readyState: 'never-ready' | 'ready' | 'unready';
  playerName: string | null;
}

export interface DisconnectedSeatRecord {
  disconnectedAt: string;
}

export interface RoomRecord {
  activeSeatIndices?: number[];
  authenticatedSeats?: number[];
  createdAt: string;
  disconnectedSeats?: Record<string, DisconnectedSeatRecord>;
  expiresAt: number;
  hostSeatIndex: number;
  lobbyPlayers?: LobbyPlayerRecord[];
  roomCode: string;
  seatCapacity: number;
  seatTokenHashes: Array<string | null>;
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
  update(room: RoomRecord, expectedVersion?: number): Promise<void>;
}

export interface ConnectionRepository {
  delete(connectionId: string): Promise<void>;
  get(connectionId: string): Promise<ConnectionRecord | null>;
  listByRoomCode(roomCode: string): Promise<ConnectionRecord[]>;
  put(record: ConnectionRecord): Promise<void>;
}
