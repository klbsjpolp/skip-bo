import type { Card, GameConfig, GameState } from '../types/index.js';
import { createDeck } from './deck.js';

export const STOCK_STORAGE_KEY = 'skipbo_stock_size';
export const STOCK_SIZE_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] as const;
export const DEFAULT_STOCK_SIZE = 30;

interface InitialGameStateOptions {
  playerCount?: number;
  stockSize?: number;
}

const SUPPORTED_PLAYER_COUNTS = [2, 3, 4] as const;

const parsePlayerCount = (value: unknown): number | null => {
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    SUPPORTED_PLAYER_COUNTS.includes(value as (typeof SUPPORTED_PLAYER_COUNTS)[number])
  ) {
    return value;
  }

  return null;
};

const parseStockSize = (value: unknown): number | null => {
  if (typeof value === 'number' && STOCK_SIZE_OPTIONS.includes(value as (typeof STOCK_SIZE_OPTIONS)[number])) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    const parsedValue = Number(trimmedValue);

    if (
      trimmedValue.length > 0 &&
      Number.isInteger(parsedValue) &&
      STOCK_SIZE_OPTIONS.includes(parsedValue as (typeof STOCK_SIZE_OPTIONS)[number])
    ) {
      return parsedValue;
    }
  }

  return null;
};

export function getStoredStockSize(): number {
  try {
    const storage =
      typeof globalThis === 'object' && 'localStorage' in globalThis && globalThis.localStorage
        ? globalThis.localStorage
        : null;

    if (storage) {
      const storedStockSize = parseStockSize(storage.getItem(STOCK_STORAGE_KEY));

      if (storedStockSize !== null) {
        return storedStockSize;
      }
    }
  } catch {
    /* empty */
  }
  return DEFAULT_STOCK_SIZE;
}

// Standard Skip-Bo deck: 12 copies each of ranks 1-12 (144 cards) + 18 Skip-Bo cards (162 total).
const BASE_CARD_COPIES_PER_RANK = 12;
const BASE_SKIP_BO_CARDS = 18;

// When dealing leaves fewer than this many cards in the draw pile, grow the deck by adding
// extra "decks worth" of cards (2 copies of each rank + 3 Skip-Bo cards = 27 cards per step)
// until the remaining draw pile is large enough again.
const MIN_REMAINING_DECK_CARDS = 60;
const CARD_COPIES_PER_RANK_STEP = 2;
const SKIP_BO_CARDS_STEP = 3;

function getGameConfig(options: InitialGameStateOptions = {}): GameConfig {
  const stockSize = parseStockSize(options.stockSize) ?? getStoredStockSize();
  const playerCount = parsePlayerCount(options.playerCount) ?? 2;
  const handSize = 5;
  const cardValuesMin = 1;
  const cardValuesMax = 12;
  const rankCount = cardValuesMax - cardValuesMin + 1;
  const dealtCards = playerCount * (stockSize + handSize);

  let cardCopiesPerRank = BASE_CARD_COPIES_PER_RANK;
  let skipBoCards = BASE_SKIP_BO_CARDS;
  let deckSize = cardCopiesPerRank * rankCount + skipBoCards;

  while (deckSize - dealtCards < MIN_REMAINING_DECK_CARDS) {
    cardCopiesPerRank += CARD_COPIES_PER_RANK_STEP;
    skipBoCards += SKIP_BO_CARDS_STEP;
    deckSize = cardCopiesPerRank * rankCount + skipBoCards;
  }

  return {
    DECK_SIZE: deckSize,
    SKIP_BO_CARDS: skipBoCards,
    CARD_COPIES_PER_RANK: cardCopiesPerRank,
    HAND_SIZE: handSize,
    STOCK_SIZE: stockSize,
    BUILD_PILES_COUNT: 4,
    DISCARD_PILES_COUNT: 4,
    CARD_VALUES_MIN: cardValuesMin,
    CARD_VALUES_MAX: cardValuesMax,
    CARD_VALUES_SKIP_BO: 0,
  };
}

export const initialGameState = (options: InitialGameStateOptions = {}): GameState => {
  const config = getGameConfig(options);
  const deck = createDeck(config);
  const playerCount = parsePlayerCount(options.playerCount) ?? 2;
  const players = Array.from({ length: playerCount }, (_, index) => ({
    isAI: index !== 0,
    stockPile: [] as Card[],
    hand: [] as (Card | null)[],
    discardPiles: Array.from({ length: config.DISCARD_PILES_COUNT }, () => [] as Card[]),
  }));

  // Deal stock piles
  players.forEach((player) => {
    player.stockPile = deck.splice(0, config.STOCK_SIZE);
  });

  // Deal initial hands
  players.forEach((player) => {
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
    config,
  };
};
