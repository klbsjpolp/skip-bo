import { z } from 'zod';

import { ROOM_CODE_LENGTH } from '../code.js';
import { MAX_PLAYER_NAME_LENGTH } from '../playerName.js';

export const roomCodeSchema = z.string().trim().min(1).max(ROOM_CODE_LENGTH);
export const stockSizeSchema = z.number().int().min(5).max(50).refine((value) => value % 5 === 0);
export const playerNameSchema = z.string().trim().max(MAX_PLAYER_NAME_LENGTH);
export const seatIndexSchema = z.number().int().min(0).max(3);
export const seatTokenSchema = z.string().min(1);
const localVersionSchema = z.number().int().min(1);

const authenticatedRoomRequestShape = {
  roomCode: roomCodeSchema,
  seatIndex: seatIndexSchema,
  seatToken: seatTokenSchema,
};

export const createRoomRequestSchema = z.object({
  playerName: playerNameSchema.optional(),
  stockSize: stockSizeSchema.optional(),
});

export const joinRoomRequestSchema = z.object({
  playerName: playerNameSchema.optional(),
  roomCode: roomCodeSchema,
});

export const aiCoachRequestSchema = z.object({
  ...authenticatedRoomRequestShape,
  roomVersion: z.number().int().min(1).optional(),
});

export const aiPostGameSummaryRequestSchema = z.object({
  ...authenticatedRoomRequestShape,
});

const cardSchema = z.object({
  isSkipBo: z.boolean(),
  value: z.number().int(),
});

const adviceReasonCodeSchema = z.enum([
  'play-stock',
  'play-discard',
  'play-hand',
  'complete-build-pile',
  'preserve-skip-bo',
  'discard-duplicate',
  'discard-high-card',
  'organize-discard-pile',
  'no-legal-move',
]);

const adviceRecommendationSchema = z.object({
  action: z.enum(['play', 'discard', 'end']),
  buildPileIndex: z.number().int().min(0).optional(),
  card: cardSchema.optional(),
  discardPileIndex: z.number().int().min(0).optional(),
  reasonCodes: z.array(adviceReasonCodeSchema).min(1),
  score: z.number(),
  source: z.enum(['stock', 'hand', 'discard']).optional(),
  sourceDiscardPileIndex: z.number().int().min(0).optional(),
  sourceIndex: z.number().int().min(-1).optional(),
});

const insightActionLogEntrySchema = z.object({
  action: z.enum(['play', 'discard']),
  buildPileIndex: z.number().int().min(0).max(3).optional(),
  card: cardSchema.optional(),
  completedBuildPile: z.boolean().optional(),
  discardPileIndex: z.number().int().min(0).max(3).optional(),
  playerIndex: seatIndexSchema,
  source: z.enum(['stock', 'hand', 'discard']),
  sourceDiscardPileIndex: z.number().int().min(0).max(3).optional(),
  sourceIndex: z.number().int().min(-1).max(99).optional(),
  stockCountAfter: z.number().int().min(0).max(50),
  stockCountBefore: z.number().int().min(0).max(50),
  version: z.number().int().min(1),
});

export const aiCoachResponseSchema = z.object({
  displayText: z.string().max(140),
  fallbackUsed: z.boolean(),
  recommendation: adviceRecommendationSchema,
  roomVersion: z.number().int().min(1),
});

export const aiPostGameSummaryResponseSchema = z.object({
  displayText: z.string().max(140),
  fallbackUsed: z.boolean(),
  roomVersion: z.number().int().min(1),
});

export const aiLocalCoachRequestSchema = z.object({
  localVersion: localVersionSchema.optional(),
  recommendation: adviceRecommendationSchema,
});

export const aiLocalCoachResponseSchema = z.object({
  displayText: z.string().max(140),
  fallbackUsed: z.boolean(),
  localVersion: localVersionSchema.optional(),
});

export const aiLocalPostGameSummaryRequestSchema = z.object({
  actionLog: z.array(insightActionLogEntrySchema).max(200),
  localVersion: localVersionSchema.optional(),
  playerIndex: seatIndexSchema,
  winnerIndex: seatIndexSchema.nullable(),
});

export const aiLocalPostGameSummaryResponseSchema = z.object({
  displayText: z.string().max(140),
  fallbackUsed: z.boolean(),
  localVersion: localVersionSchema.optional(),
});
z.object({
  expiresAt: z.string().datetime(),
  hostSeatIndex: z.number().int().min(0).max(3),
  roomCode: z.string().length(ROOM_CODE_LENGTH),
  seatCapacity: z.number().int().min(2).max(4),
  seatIndex: seatIndexSchema,
  seatToken: seatTokenSchema,
  wsUrl: z.string().url(),
});
