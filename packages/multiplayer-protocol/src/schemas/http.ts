import { z } from 'zod';

import { ROOM_CODE_LENGTH } from '../code.js';

export const roomCodeSchema = z.string().trim().min(1).max(ROOM_CODE_LENGTH);
export const stockSizeSchema = z.number().int().min(5).max(50).refine((value) => value % 5 === 0);

export const createRoomRequestSchema = z.object({
  stockSize: stockSizeSchema.optional(),
});

export const joinRoomRequestSchema = z.object({
  roomCode: roomCodeSchema,
});

export const roomSessionSchema = z.object({
  expiresAt: z.string().datetime(),
  roomCode: z.string().length(ROOM_CODE_LENGTH),
  seatIndex: z.number().int().min(0).max(1),
  seatToken: z.string().min(1),
  wsUrl: z.string().url(),
});
