export interface RoomSession {
  expiresAt: string;
  hostSeatIndex: number;
  roomCode: string;
  seatCapacity: number;
  seatIndex: number;
  seatToken: string;
  wsUrl: string;
}

export interface CreateRoomRequest {
  playerName?: string;
  /** Which game this room hosts. The server treats it as an opaque routing key. */
  gameId?: string;
  /** Opaque per-game configuration. The server stores it without interpreting it. */
  gameConfig?: unknown;
}

export interface JoinRoomRequest {
  playerName?: string;
  roomCode: string;
}

export type CreateRoomResponse = RoomSession;
export type JoinRoomResponse = RoomSession;
