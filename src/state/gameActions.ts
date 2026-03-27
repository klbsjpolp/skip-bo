import { Card } from '@/types';

export type GameAction =
  | { type: 'INIT' }
  | { type: 'DRAW'; count?: number }                              // défaut : 5
  | { type: 'DRAW_SINGLE_CARD'; card: Card; handIndex: number }   // Draw specific card to specific hand slot
  | {
      type: 'SELECT_CARD';
      source: 'hand' | 'stock' | 'discard';
      index: number;
      discardPileIndex?: number;
      plannedBuildPileIndex?: number;
      plannedDiscardPileIndex?: number;
    }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'PLAY_CARD'; buildPile: number }
  | { type: 'DISCARD_CARD'; discardPile: number }
  | { type: 'END_TURN' }
  | { type: 'RESET' }
  | { type: 'DEBUG_SET_AI_HAND'; hand: Card[] };
