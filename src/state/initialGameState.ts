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
    player.hand = deck.splice(0, CONFIG.HAND_SIZE);
  });

  return {
    deck,
    buildPiles: Array.from({ length: CONFIG.BUILD_PILES_COUNT }, () => []),
    players,
    currentPlayerIndex: 0,
    selectedCard: null,
    message: 'Nouvelle partie commencée !',
    gameIsOver: false,
  };
};