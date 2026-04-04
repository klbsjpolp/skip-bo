import type {Card, GameConfig, GameState} from '../types/index.js';
import { createDeck } from './deck.js';

export const STOCK_STORAGE_KEY = 'skipbo_stock_size';
export const STOCK_SIZE_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] as const;
export const DEFAULT_STOCK_SIZE = 30;

interface InitialGameStateOptions {
  stockSize?: number;
}

const parseStockSize = (value: unknown): number | null => {
  if (typeof value === 'number' && STOCK_SIZE_OPTIONS.includes(value as typeof STOCK_SIZE_OPTIONS[number])) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    const parsedValue = Number(trimmedValue);

    if (
      trimmedValue.length > 0 &&
      Number.isInteger(parsedValue) &&
      STOCK_SIZE_OPTIONS.includes(parsedValue as typeof STOCK_SIZE_OPTIONS[number])
    ) {
      return parsedValue;
    }
  }

  return null;
};

export function getStoredStockSize(): number {
  try {
    const storage =
      typeof globalThis === 'object' &&
      'localStorage' in globalThis &&
      globalThis.localStorage
        ? globalThis.localStorage
        : null;

    if (storage) {
      const storedStockSize = parseStockSize(storage.getItem(STOCK_STORAGE_KEY));

      if (storedStockSize !== null) {
        return storedStockSize;
      }
    }
  } catch { /* empty */ }
  return DEFAULT_STOCK_SIZE;
}

function getGameConfig(options: InitialGameStateOptions = {}):GameConfig {
  return {
    DECK_SIZE: 162,
    SKIP_BO_CARDS: 18,
    HAND_SIZE: 5,
    STOCK_SIZE: parseStockSize(options.stockSize) ?? getStoredStockSize(),
    BUILD_PILES_COUNT: 4,
    DISCARD_PILES_COUNT: 4,
    CARD_VALUES_MIN: 1,
    CARD_VALUES_MAX: 12,
    CARD_VALUES_SKIP_BO: 0,
  };
}

export const initialGameState = (options: InitialGameStateOptions = {}): GameState => {
  const config = getGameConfig(options);
  const deck = createDeck(config);
  const players = [
    { isAI: false, stockPile: [] as Card[], hand: [] as (Card | null)[], discardPiles: Array.from({ length: config.DISCARD_PILES_COUNT }, () => [] as Card[]) },
    { isAI: true,  stockPile: [] as Card[], hand: [] as (Card | null)[], discardPiles: Array.from({ length: config.DISCARD_PILES_COUNT }, () => [] as Card[]) }
  ];

  // Deal stock piles
  players.forEach(player => {
    player.stockPile = deck.splice(0, config.STOCK_SIZE);
  });

  // Deal initial hands
  players.forEach(player => {
    // Initialize hand with fixed length of config.HAND_SIZE, filled with null
    player.hand = Array<Card | null>(config.HAND_SIZE).fill(null);
    
    // Fill hand with cards from deck
    for (let i = 0; i < config.HAND_SIZE; i++) {
      if (deck.length > 0) {
        player.hand[i] = deck.shift()!;
      }
    }
  });

  return {
    deck,
    buildPiles: Array.from({ length: config.BUILD_PILES_COUNT }, () => []),
    completedBuildPiles: [], // Initialize empty completed build piles
    players,
    currentPlayerIndex: 0,
    selectedCard: null,
    message: 'Nouvelle partie commencée !',
    gameIsOver: false,
    winnerIndex: null,
    config
  };
};
