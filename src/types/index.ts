export interface Card {
  value: number;
  isSkipBo: boolean;
}

export interface Player {
  isAI: boolean;
  stockPile: Card[];
  hand: (Card | null)[];  // length always 5
  discardPiles: Card[][];
}

export interface GameState {
  deck: Card[];
  buildPiles: Card[][];
  completedBuildPiles: Card[]; // Cards from completed build piles waiting to be reshuffled
  players: Player[];
  currentPlayerIndex: number;
  gameIsOver: boolean;
  selectedCard: SelectedCard | null;
  message: string;
  aiDifficulty: AIDifficulty;
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

export const themes = [
  { value: 'theme-light' as const, label: 'Clair' },
  { value: 'theme-pastel' as const, label: 'Pastel' },
  { value: 'theme-rainbow' as const, label: 'Arc-en-ciel' },
  { value: 'theme-dark' as const, label: 'Sombre' },
  { value: 'theme-metro' as const, label: 'Metro' },
  { value: 'theme-neon' as const, label: 'Néon' },
  { value: 'theme-retro' as const, label: 'Rétro' },
];

export type Theme = typeof themes[number]['value'];

export type AIDifficulty = 'easy' | 'medium' | 'hard';

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
