export interface Card {
  value: number;
  isSkipBo: boolean;
}

export interface Player {
  isAI: boolean;
  stockPile: Card[];
  hand: Card[];
  discardPiles: Card[][];
}

export interface GameState {
  deck: Card[];
  buildPiles: Card[][];
  players: Player[];
  currentPlayerIndex: number;
  gameIsOver: boolean;
  selectedCard: SelectedCard | null;
  message: string;
}

export interface SelectedCard {
  card: Card;
  source: 'hand' | 'stock' | 'discard';
  index: number;
  discardPileIndex?: number;
}

export interface MoveResult {
  success: boolean;
  message: string;
  gameOver?: boolean;
  winner?: number;
}

export type Theme = 'light' | 'dark' | 'metro' | 'neon' | 'retro';

export interface GameConfig {
  DECK_SIZE: number;
  SKIP_BO_CARDS: number;
  HAND_SIZE: number;
  STOCK_SIZE: number;
  BUILD_PILES_COUNT: number;
  DISCARD_PILES_COUNT: number;
}

export interface AIStrategy {
  name: string;
  priority: number;
  canExecute: (gameState: GameState, playerIndex: number) => boolean;
  execute: (gameState: GameState, playerIndex: number) => MoveResult;
}
