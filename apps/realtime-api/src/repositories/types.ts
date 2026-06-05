import type { RoomStatus } from '@skipbo/realtime-core';

export class RoomVersionConflictError extends Error {
  constructor(roomCode: string) {
    super(`Room version conflict for ${roomCode}`);
    this.name = 'RoomVersionConflictError';
  }
}

export interface RoomSummaryRecord {
  finishedAt: string;
  winnerSeatIndex: number | null;
}

export interface LobbyPlayerRecord {
  seatIndex: number;
  readyState: 'never-ready' | 'ready' | 'unready';
  playerName: string | null;
}

export interface DisconnectedSeatRecord {
  disconnectedAt: string;
}

/** Opaque full-state blob pushed by the host, replayed on host reconnection. */
export interface HostSnapshotRecord {
  payload: unknown;
  version: number;
}

export interface RoomRecord {
  activeSeatIndices?: number[];
  authenticatedSeats?: number[];
  createdAt: string;
  /** Whose turn it is, as an abstract seat index. `null` while WAITING/FINISHED. */
  currentSeatIndex: number | null;
  disconnectedSeats?: Record<string, DisconnectedSeatRecord>;
  expiresAt: number;
  /** Opaque per-game configuration; the server never interprets it. */
  gameConfig?: unknown;
  /** Which game this room hosts. Opaque routing key. */
  gameId: string;
  hostSeatIndex: number;
  hostSnapshot?: HostSnapshotRecord;
  lobbyPlayers?: LobbyPlayerRecord[];
  roomCode: string;
  seatCapacity: number;
  seatTokenHashes: Array<string | null>;
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
