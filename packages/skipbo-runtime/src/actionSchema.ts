import { z } from 'zod';

// Skip-Bo move/action payload. In the relay protocol this is the shape carried
// inside `relay { kind: 'move', payload }` and validated by the host client
// (the server never inspects it).
const cardSchema = z.object({
  value: z.number().int().min(0).max(12),
  isSkipBo: z.boolean(),
});

export const skipboActionSchema = z.discriminatedUnion('type', [
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
  z.object({ type: z.literal('DEBUG_FILL_HAND_SKIPBO') }),
  z.object({ type: z.literal('DEBUG_CLEAR_STOCK_PILE') }),
  z.object({ type: z.literal('DEBUG_CLEAR_AI_STOCK_PILE') }),
  z.object({ type: z.literal('DEBUG_WIN') }),
]);

// Skip-Bo room configuration (carried as the opaque `gameConfig` in createRoom).
export const stockSizeSchema = z
  .number()
  .int()
  .min(5)
  .max(50)
  .refine((value) => value % 5 === 0);

export const skipboGameConfigSchema = z.object({
  stockSize: stockSizeSchema.optional(),
});

export type SkipboGameConfig = z.infer<typeof skipboGameConfigSchema>;
