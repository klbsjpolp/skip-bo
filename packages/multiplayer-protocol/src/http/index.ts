export interface RoomSession {
  expiresAt: string;
  roomCode: string;
  seatIndex: number;
  seatToken: string;
  wsUrl: string;
}

export interface CreateRoomRequest {
  stockSize?: number;
}

export interface JoinRoomRequest {
  roomCode: string;
}

export type CreateRoomResponse = RoomSession;
export type JoinRoomResponse = RoomSession;
