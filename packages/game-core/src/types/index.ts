export interface Card {
  value: number;
  isSkipBo: boolean;
}

export interface Player {
  name?: string;
  isAI: boolean;
  kind?: 'human' | 'ai';
  seatIndex?: number;
  stockPile: Card[];
  hand: (Card | null)[]; // length always 5
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
  { value: 'theme-paper' as const, label: 'Papier', icon: 'NotebookPen', status: null },
  { value: 'theme-midnight' as const, label: 'Minuit', icon: 'Moon', status: null },
  { value: 'theme-origami' as const, label: 'Origami', icon: 'Bird', status: null },
  { value: 'theme-candy' as const, label: 'Bonbon', icon: 'Candy', status: null },
  { value: 'theme-rainbow' as const, label: 'Arc-en-ciel', icon: 'Rainbow', status: null },
  { value: 'theme-metro' as const, label: 'Metro', icon: 'Building2', status: null },
  { value: 'theme-neon' as const, label: 'Néon', icon: 'Zap', status: null },
  { value: 'theme-retro' as const, label: 'Rétro', icon: 'Radio', status: null },
  { value: 'theme-retro-space' as const, label: 'Espace', icon: 'Rocket', status: null },
  { value: 'theme-cinema' as const, label: 'Cinéma', icon: 'Film', status: 'UPDATED' },
  { value: 'theme-glass' as const, label: 'Verre', icon: 'Squircle', status: null },
  { value: 'theme-wool' as const, label: 'Laine', icon: 'Spool', status: null },
  { value: 'theme-minecraft' as const, label: 'Minecraft', icon: 'Blocks', status: null },
  { value: 'theme-steampunk' as const, label: 'Steampunk', icon: 'Cog', status: null },
  { value: 'theme-f1' as const, label: 'Formule 1', icon: 'Flag', status: 'NEW' },
] as const;

export type ThemeDetail = (typeof themes)[number];
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
