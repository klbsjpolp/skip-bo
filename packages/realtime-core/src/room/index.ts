// Game-agnostic room, lobby and presence shapes. Nothing here knows about a
// specific game — only seats, lobby readiness, connectivity and the abstract
// turn pointer (currentSeatIndex).

export type RoomStatus = 'WAITING' | 'ACTIVE' | 'FINISHED';

export type LobbyReadyState = 'never-ready' | 'ready' | 'unready';

export interface LobbySeatInfo {
  seatIndex: number;
  readyState: LobbyReadyState;
  displayName: string | null;
}

export interface DisconnectedSeatInfo {
  seatIndex: number;
  disconnectedAt: string;
}

export interface RoomSummary {
  connectedSeats: number[];
  /** Whose turn it is, as an abstract seat index. `null` while WAITING/FINISHED. */
  currentSeatIndex: number | null;
  disconnectedSeats: DisconnectedSeatInfo[];
  expiresAt: string;
  hostSeatIndex: number;
  lobbySeats: LobbySeatInfo[];
  roomCode: string;
  seatCapacity: number;
  status: RoomStatus;
  version: number;
}
