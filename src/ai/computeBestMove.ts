import { GameState } from '@/types';
import { GameAction } from '@/state/gameActions';
import { canPlayCard } from '@/lib/validators';
import { 
  findBestDiscardPile, 
  selectCardToDiscard, 
  findBestDiscardPileToPlayFrom 
} from './discardUtils';
import { getDelay, isFeatureEnabled } from './aiConfig';
import { lookAheadEvaluation } from './lookAheadStrategy';

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
        aiPlayer.discardPiles,
        G
      );
      return { type: 'DISCARD_CARD', discardPile: bestDiscardPile };
    }
    
    // If we can't play or discard the selected card, clear selection and try again
    return { type: 'CLEAR_SELECTION' };
  }

  // Add a delay before making move decisions
  await delay(getDelay('beforeMove'));

  // Use look-ahead strategy if enabled for better decision making
  if (isFeatureEnabled('useLookAheadStrategy')) {
    const bestMove = lookAheadEvaluation(G, 2);
    if (bestMove) {
      // Convert the evaluated move to game actions
      if (bestMove.action === 'play') {
        // Select the card first, then it will be played on next turn
        if (bestMove.source === 'stock' && bestMove.sourceIndex !== undefined) {
          return { type: 'SELECT_CARD', source: 'stock', index: bestMove.sourceIndex };
        } else if (bestMove.source === 'hand' && bestMove.sourceIndex !== undefined) {
          return { type: 'SELECT_CARD', source: 'hand', index: bestMove.sourceIndex };
        } else if (bestMove.source === 'discard' && bestMove.discardPileIndex !== undefined && bestMove.sourceIndex !== undefined) {
          return {
            type: 'SELECT_CARD',
            source: 'discard',
            index: bestMove.sourceIndex,
            discardPileIndex: bestMove.discardPileIndex
          };
        }
      } else if (bestMove.action === 'discard' && bestMove.sourceIndex !== undefined) {
        // Select the card to discard
        return { type: 'SELECT_CARD', source: 'hand', index: bestMove.sourceIndex };
      }
    }
  }

  // Fallback to original logic if look-ahead doesn't provide a move
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

  // Try to play from hand - prioritize numbered cards over Skip-Bo cards
  const handPlayOrder = aiPlayer.hand
    .map((card, index) => ({ card, index }))
    .sort((a, b) => {
      // Handle null cards - put them at the end
      if (!a.card && b.card) return 1;
      if (a.card && !b.card) return -1;
      if (!a.card && !b.card) return 0;

      // Both cards are non-null at this point
      const cardA = a.card!;
      const cardB = b.card!;

      // Prioritize non-Skip-Bo cards
      if (cardA.isSkipBo && !cardB.isSkipBo) return 1;
      if (!cardA.isSkipBo && cardB.isSkipBo) return -1;

      // For non-Skip-Bo cards, prioritize lower values (easier to play)
      if (!cardA.isSkipBo && !cardB.isSkipBo) {
        return cardA.value - cardB.value;
      }

      return 0;
    });

  for (const { index: handIndex } of handPlayOrder) {
    const handCard = aiPlayer.hand[handIndex];
    for (let buildPile = 0; buildPile < G.buildPiles.length; buildPile++) {
      if (handCard && canPlayCard(handCard, buildPile, G)) {
        return { type: 'SELECT_CARD', source: 'hand', index: handIndex };
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
    const { discardPileIndex } = bestDiscardPlay;
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
  const nonSkipBoCards = aiPlayer.hand.filter((card) => card && !card.isSkipBo);
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
