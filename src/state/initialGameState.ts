import { GameState } from '@/types';
import { createDeck } from './deck';
import { CONFIG } from '@/lib/config';

export const initialGameState = (): GameState => {
  const deck = createDeck();
  const players = [
    { isAI: false, stockPile: [] as any[], hand: [] as any[], discardPiles: Array.from({ length: CONFIG.DISCARD_PILES_COUNT }, () => [] as any[]) },
    { isAI: true,  stockPile: [] as any[], hand: [] as any[], discardPiles: Array.from({ length: CONFIG.DISCARD_PILES_COUNT }, () => [] as any[]) }
  ];

  // Deal stock piles
  players.forEach(player => {
    player.stockPile = deck.splice(0, CONFIG.STOCK_SIZE);
  });

  // Deal initial hands
  players.forEach(player => {
    // Initialize hand with fixed length of CONFIG.HAND_SIZE, filled with null
    player.hand = Array(CONFIG.HAND_SIZE).fill(null);
    
    // Fill hand with cards from deck
    for (let i = 0; i < CONFIG.HAND_SIZE; i++) {
      if (deck.length > 0) {
        player.hand[i] = deck.shift()!;
      }
    }
  });

  return {
    deck,
    buildPiles: Array.from({ length: CONFIG.BUILD_PILES_COUNT }, () => []),
    completedBuildPiles: [], // Initialize empty completed build piles
    players,
    currentPlayerIndex: 0,
    selectedCard: null,
    message: 'Nouvelle partie commencée !',
    gameIsOver: false,
    aiDifficulty: 'medium', // Default AI difficulty
  };
};