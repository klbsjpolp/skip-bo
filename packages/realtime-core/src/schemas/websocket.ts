import { z } from 'zod';

import { MAX_PLAYER_NAME_LENGTH } from '../playerName.js';

const MAX_SEAT_INDEX = 3;

// ---------------------------------------------------------------------------
// Relay envelope
// ---------------------------------------------------------------------------
// The server never inspects `payload`. It only enforces:
//   - `move`: may only be sent by the seat whose turn it is (currentSeatIndex)
//   - `view`: host-only (the authoritative client pushing a redacted view)
//   - `event`: any authenticated seat (chat, resync requests, …)
export const relayKindSchema = z.enum(['move', 'event', 'view']);

export type RelayKind = z.infer<typeof relayKindSchema>;

export const relayClientMessageSchema = z.object({
  type: z.literal('relay'),
  kind: relayKindSchema,
  payload: z.unknown(),
  // Target seats. Omitted = every other authenticated seat in the room.
  toSeats: z.array(z.number().int().min(0).max(MAX_SEAT_INDEX)).optional(),
});

// ---------------------------------------------------------------------------
// Host-only control messages
// ---------------------------------------------------------------------------
export const setTurnClientMessageSchema = z.object({
  type: z.literal('setTurn'),
  currentSeatIndex: z.number().int().min(0).max(MAX_SEAT_INDEX),
});

export const snapshotClientMessageSchema = z.object({
  type: z.literal('snapshot'),
  // Opaque full-state blob the server stores for host reconnection only.
  payload: z.unknown(),
});

export const endGameClientMessageSchema = z.object({
  type: z.literal('endGame'),
  winnerSeatIndex: z.number().int().min(0).max(MAX_SEAT_INDEX).nullable(),
});

// ---------------------------------------------------------------------------
// Lobby + session messages (game-agnostic)
// ---------------------------------------------------------------------------
export const authClientMessageSchema = z.object({
  type: z.literal('auth'),
  protocolVersion: z.number().int().min(0).optional(),
  roomCode: z.string().min(1),
  seatIndex: z.number().int().min(0).max(MAX_SEAT_INDEX),
  seatToken: z.string().min(1),
});

export const startGameClientMessageSchema = z.object({
  type: z.literal('startGame'),
  clientVersion: z.number().int().min(0).optional(),
});

export const pingClientMessageSchema = z.object({
  type: z.literal('ping'),
});

export const setReadyClientMessageSchema = z.object({
  type: z.literal('setReady'),
  playerName: z.string().trim().max(MAX_PLAYER_NAME_LENGTH).optional(),
});

export const setUnreadyClientMessageSchema = z.object({
  type: z.literal('setUnready'),
});

export const kickSeatClientMessageSchema = z.object({
  type: z.literal('kickSeat'),
  targetSeatIndex: z.number().int().min(0).max(MAX_SEAT_INDEX),
});

export const leaveLobbyClientMessageSchema = z.object({
  type: z.literal('leaveLobby'),
});

export const clientMessageSchema = z.discriminatedUnion('type', [
  authClientMessageSchema,
  relayClientMessageSchema,
  setTurnClientMessageSchema,
  snapshotClientMessageSchema,
  endGameClientMessageSchema,
  startGameClientMessageSchema,
  pingClientMessageSchema,
  setReadyClientMessageSchema,
  setUnreadyClientMessageSchema,
  kickSeatClientMessageSchema,
  leaveLobbyClientMessageSchema,
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
