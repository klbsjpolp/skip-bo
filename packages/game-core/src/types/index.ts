export interface Card {
  value: number;
  isSkipBo: boolean;
}

export interface Player {
  isAI: boolean;
  kind?: 'human' | 'ai';
  seatIndex?: number;
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
  winnerIndex: number | null;
  selectedCard: SelectedCard | null;
  message: string;
  config: GameConfig;
}

export interface SelectedCard {
  card: Card;
  source: 'hand' | 'stock' | 'discard';
  index: number;
  discardPileIndex?: number;
  plannedBuildPileIndex?: number;
  plannedDiscardPileIndex?: number;
}

export interface MoveResult {
  success: boolean;
  message: string;
  gameOver?: boolean;
  winnerIndex?: number;
}

export const themes = [
  { value: 'theme-light' as const, label: 'Clair', icon: 'Sun' },
  { value: 'theme-dark' as const, label: 'Sombre', icon: 'Moon' },
  { value: 'theme-pastel' as const, label: 'Pastel', icon: 'Flower2' },
  { value: 'theme-bonbon' as const, label: 'Bonbon', icon: 'Candy' },
  { value: 'theme-rainbow' as const, label: 'Arc-en-ciel', icon: 'Rainbow' },
  { value: 'theme-metro' as const, label: 'Metro', icon: 'Building2' },
  { value: 'theme-neon' as const, label: 'Néon', icon: 'Zap' },
  { value: 'theme-retro' as const, label: 'Rétro', icon: 'Radio' },
  { value: 'theme-retro-space' as const, label: "Espace", icon: 'Rocket' },
  { value: 'theme-glass' as const, label: 'Verre', icon: 'Squircle' },
  { value: 'theme-wool' as const, label: 'Laine', icon: 'Spool' },
  { value: 'theme-minecraft' as const, label: 'Minecraft', icon: 'Blocks' },
  { value: 'theme-steampunk' as const, label: 'Steampunk', icon: 'Cog' },
] as const;

export type ThemeDetail = typeof themes[number];
export type Theme = ThemeDetail['value'];

export interface GameConfig {
  DECK_SIZE: number;
  SKIP_BO_CARDS: number;
  HAND_SIZE: number;
  STOCK_SIZE: number;
  BUILD_PILES_COUNT: number;
  DISCARD_PILES_COUNT: number;
  CARD_VALUES_MIN: number;
  CARD_VALUES_MAX: number;
  CARD_VALUES_SKIP_BO: number;
}
