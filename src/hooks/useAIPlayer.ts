import { useCallback } from 'react';
import { GameState, Card, MoveResult } from '@/types';

export const useAIPlayer = () => {
  const canPlayCardOnBuild = useCallback((card: Card, buildPile: Card[]): boolean => {
    if (buildPile.length === 0) {
      return card.isSkipBo || card.value === 1;
    }

    const topCard = buildPile[buildPile.length - 1];
    const expectedValue = topCard.value + 1;

    if (expectedValue > 12) return false;

    return card.isSkipBo || card.value === expectedValue;
  }, []);

  const findBestMove = useCallback((gameState: GameState): {
    action: 'play' | 'discard';
    source: 'hand' | 'stock' | 'discard';
    cardIndex: number;
    targetIndex: number;
    discardPileIndex?: number;
  } | null => {
    const aiPlayer = gameState.players[1];

    // Priority 1: Try to play from stock pile
    if (aiPlayer.stockPile.length > 0) {
      const stockCard = aiPlayer.stockPile[aiPlayer.stockPile.length - 1];
      for (let i = 0; i < gameState.buildPiles.length; i++) {
        if (canPlayCardOnBuild(stockCard, gameState.buildPiles[i])) {
          return {
            action: 'play',
            source: 'stock',
            cardIndex: aiPlayer.stockPile.length - 1,
            targetIndex: i
          };
        }
      }
    }

    // Priority 2: Try to play from hand
    for (let cardIndex = 0; cardIndex < aiPlayer.hand.length; cardIndex++) {
      const card = aiPlayer.hand[cardIndex];
      for (let buildIndex = 0; buildIndex < gameState.buildPiles.length; buildIndex++) {
        if (canPlayCardOnBuild(card, gameState.buildPiles[buildIndex])) {
          return {
            action: 'play',
            source: 'hand',
            cardIndex,
            targetIndex: buildIndex
          };
        }
      }
    }

    // Priority 3: Try to play from discard piles
    for (let pileIndex = 0; pileIndex < aiPlayer.discardPiles.length; pileIndex++) {
      const pile = aiPlayer.discardPiles[pileIndex];
      if (pile.length > 0) {
        const topCard = pile[pile.length - 1];
        for (let buildIndex = 0; buildIndex < gameState.buildPiles.length; buildIndex++) {
          if (canPlayCardOnBuild(topCard, gameState.buildPiles[buildIndex])) {
            return {
              action: 'play',
              source: 'discard',
              cardIndex: pile.length - 1,
              targetIndex: buildIndex,
              discardPileIndex: pileIndex
            };
          }
        }
      }
    }

    // Priority 4: Discard a card from hand (if we have cards)
    if (aiPlayer.hand.length > 0) {
      // Find the best discard pile (prefer empty piles or piles with higher values)
      let bestDiscardPile = 0;
      let bestScore = -1;

      for (let i = 0; i < aiPlayer.discardPiles.length; i++) {
        const pile = aiPlayer.discardPiles[i];
        const score = pile.length === 0 ? 100 : pile[pile.length - 1].value;
        if (score > bestScore) {
          bestScore = score;
          bestDiscardPile = i;
        }
      }

      // Choose least valuable card to discard (avoid Skip-Bo cards)
      let cardToDiscard = 0;
      let lowestValue = Infinity;

      for (let i = 0; i < aiPlayer.hand.length; i++) {
        const card = aiPlayer.hand[i];
        const value = card.isSkipBo ? 100 : card.value; // Skip-Bo cards are valuable
        if (value < lowestValue) {
          lowestValue = value;
          cardToDiscard = i;
        }
      }

      return {
        action: 'discard',
        source: 'hand',
        cardIndex: cardToDiscard,
        targetIndex: bestDiscardPile
      };
    }

    return null;
  }, [canPlayCardOnBuild]);

  const makeAIMove = useCallback(async (
    gameState: GameState,
    playCard: (buildPileIndex: number) => MoveResult,
    discardCard: (discardPileIndex: number) => MoveResult,
    selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void
  ): Promise<boolean> => {
    // Add a small delay to make AI moves more visible
    await new Promise(resolve => setTimeout(resolve, 1000));

    const move = findBestMove(gameState);
    if (!move) return false;

    // Select the card first
    selectCard(move.source, move.cardIndex, move.discardPileIndex);

    // Add another small delay before executing the move
    await new Promise(resolve => setTimeout(resolve, 500));

    if (move.action === 'play') {
      const result = playCard(move.targetIndex);
      return result.success;
    } else if (move.action === 'discard') {
      const result = discardCard(move.targetIndex);
      return result.success;
    }

    return false;
  }, [findBestMove]);

  return {
    makeAIMove,
    findBestMove,
  };
};
