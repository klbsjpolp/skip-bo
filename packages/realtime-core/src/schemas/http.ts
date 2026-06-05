import { z } from 'zod';

import { ROOM_CODE_LENGTH } from '../code.js';
import { MAX_PLAYER_NAME_LENGTH } from '../playerName.js';

export const roomCodeSchema = z.string().trim().min(1).max(ROOM_CODE_LENGTH);
export const playerNameSchema = z.string().trim().max(MAX_PLAYER_NAME_LENGTH);
export const gameIdSchema = z.string().trim().min(1).max(64);

export const createRoomRequestSchema = z.object({
  playerName: playerNameSchema.optional(),
  gameId: gameIdSchema.optional(),
  // Opaque to the server; the host client validates it against the game.
  gameConfig: z.unknown().optional(),
});

export const joinRoomRequestSchema = z.object({
  playerName: playerNameSchema.optional(),
  roomCode: roomCodeSchema,
});

export const roomSessionSchema = z.object({
  expiresAt: z.string().datetime(),
  hostSeatIndex: z.number().int().min(0).max(3),
  roomCode: z.string().length(ROOM_CODE_LENGTH),
  seatCapacity: z.number().int().min(2).max(4),
  seatIndex: z.number().int().min(0).max(3),
  seatToken: z.string().min(1),
  wsUrl: z.string().url(),
});
