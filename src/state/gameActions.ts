export type GameAction =
  | { type: 'INIT' }
  | { type: 'DRAW'; count?: number }                              // défaut : 5
  | { type: 'SELECT_CARD'; source: 'hand' | 'stock' | 'discard'; index: number; discardPileIndex?: number }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'PLAY_CARD'; buildPile: number }
  | { type: 'DISCARD_CARD'; discardPile: number }
  | { type: 'END_TURN' }
  | { type: 'RESET' };