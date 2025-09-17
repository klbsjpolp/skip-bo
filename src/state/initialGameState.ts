import {Card, GameConfig, GameState} from '@/types';
import { createDeck } from './deck';

export const STOCK_STORAGE_KEY = 'skipbo_stock_size';
export const DEFAULT_STOCK_SIZE = 30; // Requirement: default 30

export function getStoredStockSize(): number {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STOCK_STORAGE_KEY);
      const n = raw ? parseInt(raw, 10) : NaN;
      if (!Number.isNaN(n) && n > 0) {
        return n;
      }
    }
  } catch { /* empty */ }
  return DEFAULT_STOCK_SIZE;
}

function getGameConfig():GameConfig {
  return {
    DECK_SIZE: 162,
    SKIP_BO_CARDS: 18,
    HAND_SIZE: 5,
    STOCK_SIZE: getStoredStockSize(),
    BUILD_PILES_COUNT: 4,
    DISCARD_PILES_COUNT: 4,
  };
}

export const initialGameState = (): GameState => {
  const config = getGameConfig();
  const deck = createDeck(config);
  const players = [
    { isAI: false, stockPile: [] as Card[], hand: [] as Card[], discardPiles: Array.from({ length: config.DISCARD_PILES_COUNT }, () => [] as Card[]) },
    { isAI: true,  stockPile: [] as Card[], hand: [] as Card[], discardPiles: Array.from({ length: config.DISCARD_PILES_COUNT }, () => [] as Card[]) }
  ];

  // Deal stock piles
  players.forEach(player => {
    player.stockPile = deck.splice(0, config.STOCK_SIZE);
  });

  // Deal initial hands
  players.forEach(player => {
    // Initialize hand with fixed length of config.HAND_SIZE, filled with null
    player.hand = Array(config.HAND_SIZE).fill(null);
    
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
    aiDifficulty: 'medium', // Default AI difficulty
    config
  };
};