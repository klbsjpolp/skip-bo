import { z } from 'zod';

const cardSchema = z.object({
  value: z.number().int().min(0).max(12),
  isSkipBo: z.boolean(),
});

export const gameActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('INIT') }),
  z.object({ type: z.literal('DRAW'), count: z.number().int().positive().optional() }),
  z.object({
    type: z.literal('DRAW_SINGLE_CARD'),
    card: cardSchema,
    handIndex: z.number().int().min(0),
  }),
  z.object({
    type: z.literal('SELECT_CARD'),
    source: z.enum(['hand', 'stock', 'discard']),
    index: z.number().int().min(0),
    discardPileIndex: z.number().int().min(0).optional(),
    plannedBuildPileIndex: z.number().int().min(0).optional(),
    plannedDiscardPileIndex: z.number().int().min(0).optional(),
  }),
  z.object({ type: z.literal('CLEAR_SELECTION') }),
  z.object({
    type: z.literal('PLAY_CARD'),
    buildPile: z.number().int().min(0),
    animationDuration: z.number().int().min(0).optional(),
  }),
  z.object({
    type: z.literal('DISCARD_CARD'),
    discardPile: z.number().int().min(0),
  }),
  z.object({ type: z.literal('END_TURN') }),
  z.object({ type: z.literal('RESET') }),
  z.object({
    type: z.literal('DEBUG_SET_AI_HAND'),
    hand: z.array(cardSchema),
  }),
  z.object({
    type: z.literal('DEBUG_FILL_BUILD_PILE'),
    buildPile: z.number().int().min(0),
  }),
]);

export const authClientMessageSchema = z.object({
  roomCode: z.string().min(1),
  seatIndex: z.number().int().min(0).max(1),
  seatToken: z.string().min(1),
  type: z.literal('auth'),
});

export const actionClientMessageSchema = z.object({
  action: gameActionSchema,
  clientVersion: z.number().int().min(0).optional(),
  type: z.literal('action'),
});

export const pingClientMessageSchema = z.object({
  type: z.literal('ping'),
});

export const clientMessageSchema = z.discriminatedUnion('type', [
  authClientMessageSchema,
  actionClientMessageSchema,
  pingClientMessageSchema,
]);
