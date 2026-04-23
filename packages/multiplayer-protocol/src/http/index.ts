import type {AdviceRecommendation, InsightActionLogEntry} from '@skipbo/game-core';

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

export interface AuthenticatedRoomRequest {
  roomCode: string;
  seatIndex: number;
  seatToken: string;
}

export interface AiCoachRequest extends AuthenticatedRoomRequest {
  roomVersion?: number;
}

export interface AiCoachResponse {
  displayText: string;
  fallbackUsed: boolean;
  recommendation: AdviceRecommendation;
  roomVersion: number;
}

export type AiPostGameSummaryRequest = AuthenticatedRoomRequest;

export interface AiPostGameSummaryResponse {
  displayText: string;
  fallbackUsed: boolean;
  roomVersion: number;
}

export interface AiLocalCoachRequest {
  localVersion?: number;
  recommendation: AdviceRecommendation;
}

export interface AiLocalCoachResponse {
  displayText: string;
  fallbackUsed: boolean;
  localVersion?: number;
}

export interface AiLocalPostGameSummaryRequest {
  actionLog: InsightActionLogEntry[];
  localVersion?: number;
  playerIndex: number;
  winnerIndex: number | null;
}

export interface AiLocalPostGameSummaryResponse {
  displayText: string;
  fallbackUsed: boolean;
  localVersion?: number;
}
