import type { GameAction } from '@skipbo/game-core';

import type { ClientGameView, RoomStatus, RoomSummary } from '../views/index.js';

export interface AuthClientMessage {
  roomCode: string;
  seatIndex: number;
  seatToken: string;
  type: 'auth';
}

export interface ActionClientMessage {
  action: GameAction;
  clientVersion?: number;
  type: 'action';
}

export interface PingClientMessage {
  type: 'ping';
}

export type ClientMessage = AuthClientMessage | ActionClientMessage | PingClientMessage;

export interface SnapshotServerMessage {
  type: 'snapshot';
  view: ClientGameView;
}

export interface ActionRejectedServerMessage {
  code: 'forbidden' | 'invalid_action' | 'invalid_state' | 'not_authenticated';
  reason: string;
  type: 'actionRejected';
  view?: ClientGameView;
}

export interface PresenceServerMessage {
  room: RoomSummary;
  type: 'presence';
}

export interface RoomClosedServerMessage {
  roomCode: string;
  status: RoomStatus;
  type: 'roomClosed';
}

export type ServerMessage =
  | SnapshotServerMessage
  | ActionRejectedServerMessage
  | PresenceServerMessage
  | RoomClosedServerMessage;
