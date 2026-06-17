import type { GameState } from '@skipbo/game-core';
import type { HostRoomMeta } from '@skipbo/skipbo-runtime';
import type { RoomSummary } from '@klbsjpolp/realtime-core';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

/** Opaque blob the host stores on the server for its own reconnection. */
export interface HostSnapshotPayload {
  state: GameState;
  activeSeatIndices: number[];
}

export const toRoomMeta = (room: RoomSummary): HostRoomMeta => ({
  connectedSeats: room.connectedSeats,
  disconnectedSeats: room.disconnectedSeats,
  expiresAt: room.expiresAt,
  hostSeatIndex: room.hostSeatIndex,
  lobbySeats: room.lobbySeats,
  roomCode: room.roomCode,
  seatCapacity: room.seatCapacity,
  status: room.status,
  version: room.version,
});
