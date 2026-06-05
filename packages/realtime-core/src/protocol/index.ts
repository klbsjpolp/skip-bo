import type { RelayKind } from '../schemas/websocket.js';
import type { RoomStatus, RoomSummary } from '../room/index.js';

// ---------------------------------------------------------------------------
// Server -> client messages (game-agnostic)
// ---------------------------------------------------------------------------

/** An opaque message forwarded from another seat. `payload` is never inspected. */
export interface RelayedServerMessage {
  type: 'relayed';
  fromSeat: number;
  kind: RelayKind;
  payload: unknown;
}

/** The abstract turn pointer changed. */
export interface TurnServerMessage {
  type: 'turn';
  currentSeatIndex: number;
}

/**
 * The host pressed start. The server has shuffled the seating and set the
 * first turn; the host now builds the real game state from this.
 */
export interface GameStartedServerMessage {
  type: 'gameStarted';
  activeSeatIndices: number[];
  currentSeatIndex: number;
  gameConfig?: unknown;
}

/**
 * Sent to the host seat on reconnect: the opaque full-state blob it last pushed,
 * or `null` if none was stored yet.
 */
export interface SnapshotRestoreServerMessage {
  type: 'snapshotRestore';
  payload: unknown;
}

export interface PresenceServerMessage {
  type: 'presence';
  room: RoomSummary;
}

export interface RoomClosedServerMessage {
  type: 'roomClosed';
  roomCode: string;
  status: RoomStatus;
}

export interface ActionRejectedServerMessage {
  type: 'actionRejected';
  code: 'forbidden' | 'invalid_action' | 'invalid_state' | 'not_authenticated' | 'not_your_turn';
  reason: string;
}

export type ServerMessage =
  | RelayedServerMessage
  | TurnServerMessage
  | GameStartedServerMessage
  | SnapshotRestoreServerMessage
  | PresenceServerMessage
  | RoomClosedServerMessage
  | ActionRejectedServerMessage;
