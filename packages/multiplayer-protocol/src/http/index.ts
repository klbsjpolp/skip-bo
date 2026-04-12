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
  stockSize?: number;
}

export interface JoinRoomRequest {
  playerName?: string;
  roomCode: string;
}

export type CreateRoomResponse = RoomSession;
export type JoinRoomResponse = RoomSession;
