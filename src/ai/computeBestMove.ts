import { GameState } from '@/types';
import { GameAction } from '@/state/gameActions';
import { canPlayCard } from '@/lib/validators';
import { 
  findBestDiscardPile, 
  selectCardToDiscard, 
  findBestDiscardPileToPlayFrom 
} from './discardUtils';
import { getDelay } from './aiConfig';

// Add a delay utility function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// retourne une action que le bot souhaite exécuter
export const computeBestMove = async (G: GameState): Promise<GameAction> => {
  const aiPlayer = G.players[G.currentPlayerIndex];
  
  // If no AI player or game is over, end turn
  if (!aiPlayer.isAI || G.gameIsOver) {
    return { type: 'END_TURN' };
  }

  // If we have a selected card, try to play it first
  if (G.selectedCard) {
    // Add a small delay before processing selected card
    await delay(getDelay('afterCardSelection'));

    // Check if we can play the selected card on any build pile
    for (let buildPile = 0; buildPile < G.buildPiles.length; buildPile++) {
      if (canPlayCard(G.selectedCard.card, buildPile, G)) {
        return { type: 'PLAY_CARD', buildPile };
      }
    }
    
    // If can't play, discard from hand (if it's from hand and not Skip-Bo)
    if (G.selectedCard.source === 'hand' && !G.selectedCard.card.isSkipBo) {
      // Find the best discard pile using strategic selection
      const bestDiscardPile = findBestDiscardPile(
        G.selectedCard.card, 
        aiPlayer.discardPiles
      );
      return { type: 'DISCARD_CARD', discardPile: bestDiscardPile };
    }
    
    // If we can't play or discard the selected card, clear selection and try again
    return { type: 'CLEAR_SELECTION' };
  }

  // Add a delay before making move decisions
  await delay(getDelay('beforeMove'));

  // Try to play from stock pile first (highest priority)
  if (aiPlayer.stockPile.length > 0) {
    const stockCard = aiPlayer.stockPile[aiPlayer.stockPile.length - 1];
    for (let buildPile = 0; buildPile < G.buildPiles.length; buildPile++) {
      if (canPlayCard(stockCard, buildPile, G)) {
        // Select the stock card first
        return { type: 'SELECT_CARD', source: 'stock', index: aiPlayer.stockPile.length - 1 };
      }
    }
  }

  // Try to play from hand - first try non-Skip-Bo cards
  for (let handIndex = 0; handIndex < aiPlayer.hand.length; handIndex++) {
    const handCard = aiPlayer.hand[handIndex];
    if (!handCard.isSkipBo) {
      for (let buildPile = 0; buildPile < G.buildPiles.length; buildPile++) {
        if (canPlayCard(handCard, buildPile, G)) {
          return { type: 'SELECT_CARD', source: 'hand', index: handIndex };
        }
      }
    }
  }

  // Then try Skip-Bo cards from hand (only if they can be played)
  for (let handIndex = 0; handIndex < aiPlayer.hand.length; handIndex++) {
    const handCard = aiPlayer.hand[handIndex];
    if (handCard.isSkipBo) {
      for (let buildPile = 0; buildPile < G.buildPiles.length; buildPile++) {
        if (canPlayCard(handCard, buildPile, G)) {
          return { type: 'SELECT_CARD', source: 'hand', index: handIndex };
        }
      }
    }
  }

  // Try to play from discard piles using strategic selection
  const bestDiscardPlay = findBestDiscardPileToPlayFrom(
    aiPlayer.discardPiles,
    G.buildPiles,
    G
  );
  
  if (bestDiscardPlay) {
    const { discardPileIndex} = bestDiscardPlay;
    const discardPile = aiPlayer.discardPiles[discardPileIndex];
    
    // Select the discard card first
    return { 
      type: 'SELECT_CARD', 
      source: 'discard', 
      index: discardPile.length - 1, 
      discardPileIndex 
    };
  }

  // If hand is not empty and can't play anything, select the best card to discard
  const nonSkipBoCards = aiPlayer.hand.filter((card) => !card.isSkipBo);
  if (nonSkipBoCards.length > 0) {
    // Use strategic card selection to find the best card to discard
    const cardIndex = selectCardToDiscard(aiPlayer.hand, G);
    if (cardIndex !== -1) {
      return { type: 'SELECT_CARD', source: 'hand', index: cardIndex };
    }
  }

  // If we only have Skip-Bo cards in hand and can't play them, end turn
  // This prevents the AI from getting stuck trying to discard Skip-Bo cards
  return { type: 'END_TURN' };
};