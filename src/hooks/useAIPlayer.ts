import {useCallback} from 'react';
import {Card, GameState, MoveResult} from '@/types';

export const useAIPlayer = () => {
  // Helper function to force the AI to discard a card
  const forceDiscard = async (
    selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void,
    discardCard: (discardPileIndex: number) => Promise<MoveResult>,
    getLatestGameState: () => GameState
  ): Promise<boolean> => {
    // Get the latest game state before starting
    const latestGameState = getLatestGameState();
    
    // Check if it's still the AI's turn
    if (latestGameState.currentPlayerIndex !== 1) {
      console.log(`[AI] Not AI's turn anymore. Current player index: ${latestGameState.currentPlayerIndex}`);
      return false;
    }

    const aiPlayer = latestGameState.players[1];

    // If there are no cards in hand, we can't discard
    if (aiPlayer.hand.length === 0) {
      console.log(`[AI] Cannot discard: No cards in hand`);
      return false;
    }
    
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
    let cardToDiscard = -1;
    let lowestValue = Infinity;

    // First try to find a non-Skip-Bo card
    for (let i = 0; i < aiPlayer.hand.length; i++) {
      const card = aiPlayer.hand[i];
      if (!card.isSkipBo && card.value < lowestValue) {
        lowestValue = card.value;
        cardToDiscard = i;
      }
    }
    
    // If we couldn't find a non-Skip-Bo card, we can't discard
    if (cardToDiscard === -1) {
      console.log(`[AI] Cannot discard: Only Skip-Bo cards in hand`);
      return false;
    }
    
    // Make a deep copy of the card to discard to ensure we have the correct value
    const cardToDiscardObj = { ...aiPlayer.hand[cardToDiscard] };
    
    // Gather debug info
    const playerHand = aiPlayer.hand.map(c => c.value);
    const topDeckCard = aiPlayer.stockPile.length > 0 ? aiPlayer.stockPile[aiPlayer.stockPile.length - 1].value : null;
    const topDiscardPiles = aiPlayer.discardPiles.map(pile => pile.length > 0 ? pile[pile.length - 1].value : null);
    // Construction piles are not available here

    // Select the card to discard
    console.log(`[AI] Action: select, Selecting card to discard. Hand:`, playerHand,
      `| Selected index: ${cardToDiscard}, Card:`, cardToDiscardObj,
      `| TopDeck:`, topDeckCard,
      `| TopDiscardPiles:`, topDiscardPiles
    );
    
    try {
      // Select the card
      selectCard('hand', cardToDiscard);
      
      // Add a small delay before discarding
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the latest game state after selection
      const updatedGameState = getLatestGameState();
      
      // Check if it's still the AI's turn
      if (updatedGameState.currentPlayerIndex !== 1) {
        console.log(`[AI] Not AI's turn anymore after selection. Current player index: ${updatedGameState.currentPlayerIndex}`);
        return false;
      }
      
      // Check if a card is actually selected
      if (!updatedGameState.selectedCard) {
        console.log(`[AI] No card selected after selection operation. Trying again.`);
        // Try selecting again
        selectCard('hand', cardToDiscard);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check again
        const retryGameState = getLatestGameState();
        if (!retryGameState.selectedCard) {
          console.log(`[AI] Still no card selected after retry. Aborting discard.`);
          return false;
        }
      }
      
      // Discard the card
      console.log(`[AI] Action: discard, Discarding card. DiscardPile: ${bestDiscardPile}, Card:`, cardToDiscardObj,
        `| Hand:`, playerHand,
        `| TopDeck:`, topDeckCard,
        `| TopDiscardPiles:`, topDiscardPiles
      );
      
      const discardResult = await discardCard(bestDiscardPile);
      
      if (!discardResult.success) {
        console.log(`[AI] Discard failed: ${discardResult.message}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.log(`[AI] Error during discard process:`, error);
      return false;
    }
  };

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

      // Choose least valuable card to discard (never discard Skip-Bo cards)
      let cardToDiscard = -1;
      let lowestValue = Infinity;

      // First, try to find a non-Skip-Bo card
      for (let i = 0; i < aiPlayer.hand.length; i++) {
        const card = aiPlayer.hand[i];
        if (!card.isSkipBo && card.value < lowestValue) {
          lowestValue = card.value;
          cardToDiscard = i;
        }
      }
      
      // If we couldn't find a non-Skip-Bo card, we can't discard
      if (cardToDiscard === -1) {
        console.log(`[AI] Cannot find a non-Skip-Bo card to discard`);
        return null;
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
    playCard: (buildPileIndex: number) => Promise<MoveResult>,
    discardCard: (discardPileIndex: number) => Promise<MoveResult>,
    selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void,
    clearSelection: () => void,
    getLatestGameState: () => GameState = () => gameState
  ): Promise<boolean> => {
    try {
      // Add a small delay to make AI moves more visible
      await new Promise(resolve => setTimeout(resolve, 1000));
  
      // Get the AI player
      const aiPlayer = gameState.players[1];
      
      // Check if it's actually the AI's turn
      if (gameState.currentPlayerIndex !== 1) {
        console.log(`[AI] Not AI's turn. Current player index: ${gameState.currentPlayerIndex}`);
        return false;
      }
      
      // Make sure no card is selected before starting
      clearSelection();
      
      // Add a small delay to ensure the selection is cleared
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Gather debug info
      const playerHand = aiPlayer.hand.map(c => c.value);
      const topDeckCard = aiPlayer.stockPile.length > 0 ? aiPlayer.stockPile[aiPlayer.stockPile.length - 1].value : null;
      const topDiscardPiles = aiPlayer.discardPiles.map(pile => pile.length > 0 ? pile[pile.length - 1].value : null);
      const topBuildPiles = gameState.buildPiles.map(pile => pile.length > 0 ? pile[pile.length - 1].value : null);
  
      // Find the best move using the current game state
      let move = findBestMove(gameState);
      
      // If there's a move and it's a play move, execute it
      if (move && move.action === 'play') {
        try {
          // Select the card first
          console.log(`[AI] Action: select, Selecting card to play. Source: ${move.source}, Index: ${move.cardIndex}, DiscardPileIndex: ${move.discardPileIndex}`,
            `| Hand:`, playerHand,
            `| TopDeck:`, topDeckCard,
            `| TopDiscardPiles:`, topDiscardPiles,
            `| TopBuildPiles:`, topBuildPiles
          );
          selectCard(move.source, move.cardIndex, move.discardPileIndex);
  
          // Add another small delay before executing the move
          await new Promise(resolve => setTimeout(resolve, 500));
  
          // Play the card
          console.log(`[AI] Action: play, Playing card to BuildPile: ${move.targetIndex}`,
            `| Hand:`, playerHand,
            `| TopDeck:`, topDeckCard,
            `| TopDiscardPiles:`, topDiscardPiles,
            `| TopBuildPiles:`, topBuildPiles
          );
          const playResult = await playCard(move.targetIndex);
          
          if (!playResult.success) {
            console.log(`[AI] Play failed: ${playResult.message}`);
            
            // Clear the selection before trying to discard
            clearSelection();
            
            // Add a small delay to ensure the selection is cleared
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Try to find a card to discard using forceDiscard
            // This is a fallback in case the play move was invalid
            return await forceDiscard(selectCard, discardCard, getLatestGameState);
          }
          
          // After playing, add another delay before discarding
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Always discard a card after playing
          return await forceDiscard(selectCard, discardCard, getLatestGameState);
        } catch (error) {
          console.log(`[AI] Error during play move:`, error);
          
          // Clear the selection before trying to recover
          clearSelection();
          
          // Add a small delay to ensure the selection is cleared
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Try to recover by forcing a discard
          return await forceDiscard(selectCard, discardCard, getLatestGameState);
        }
      } else if (move && move.action === 'discard') {
        try {
          // If we can only discard, do that
          console.log(`[AI] Action: select, Selecting card to discard. Source: ${move.source}, Index: ${move.cardIndex}, DiscardPileIndex: ${move.discardPileIndex}`,
            `| Hand:`, playerHand,
            `| TopDeck:`, topDeckCard,
            `| TopDiscardPiles:`, topDiscardPiles,
            `| TopBuildPiles:`, topBuildPiles
          );
          
          // Check if the card is a Skip-Bo (we can't discard Skip-Bo cards)
          if (move.source === 'hand' && aiPlayer.hand[move.cardIndex].isSkipBo) {
            console.log(`[AI] Cannot discard Skip-Bo card. Trying forceDiscard instead.`);
            return await forceDiscard(selectCard, discardCard, getLatestGameState);
          }
          
          selectCard(move.source, move.cardIndex, move.discardPileIndex);
  
          // Add another small delay before executing the move
          await new Promise(resolve => setTimeout(resolve, 500));
  
          console.log(`[AI] Action: discard, Discarding card to DiscardPile: ${move.targetIndex}`,
            `| Hand:`, playerHand,
            `| TopDeck:`, topDeckCard,
            `| TopDiscardPiles:`, topDiscardPiles,
            `| TopBuildPiles:`, topBuildPiles
          );
          const result = await discardCard(move.targetIndex);
          
          if (!result.success) {
            console.log(`[AI] Discard failed: ${result.message}`);
            
            // Clear the selection before trying again
            clearSelection();
            
            // Add a small delay to ensure the selection is cleared
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Try again with forceDiscard
            return await forceDiscard(selectCard, discardCard, getLatestGameState);
          }
          
          return true;
        } catch (error) {
          console.log(`[AI] Error during discard move:`, error);
          
          // Clear the selection before trying to recover
          clearSelection();
          
          // Add a small delay to ensure the selection is cleared
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Try to recover by forcing a discard
          return await forceDiscard(selectCard, discardCard, getLatestGameState);
        }
      }
      
      // No move found by findBestMove, but we should still discard if we have cards in hand
      console.log(`[AI] No move found. Trying forceDiscard.`);
      
      // Make sure no card is selected
      clearSelection();
      
      // Add a small delay to ensure the selection is cleared
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Try to discard a card
      return await forceDiscard(selectCard, discardCard, getLatestGameState);
    } catch (error) {
      console.log(`[AI] Critical error in makeAIMove:`, error);
      return false;
    }
  }, [findBestMove]);

  return {
    makeAIMove,
    findBestMove,
  };
};
