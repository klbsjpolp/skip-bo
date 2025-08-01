import { Card, GameState } from '@/types';
import { getWeights, isFeatureEnabled } from './aiConfig';
import { canPlayCard } from '@/lib/validators';

/**
 * Analyzes opponent progress and returns strategic insights
 */
const analyzeOpponents = (gameState: GameState) => {
  const opponents = gameState.players.filter((_, index) => index !== gameState.currentPlayerIndex);

  return {
    closestToWinning: Math.min(...opponents.map(p => p.stockPile.length)),
    avgStockPileSize: opponents.reduce((sum, p) => sum + p.stockPile.length, 0) / opponents.length,
    totalOpponentCards: opponents.reduce((sum, p) => sum + p.hand.length + p.stockPile.length, 0)
  };
};

/**
 * Calculates card availability in the game for strategic decisions
 */
const analyzeCardAvailability = (gameState: GameState, targetValue: number) => {
  let visibleCards = 0;
  let totalPossibleCards = targetValue === 12 ? 12 : 12; // Skip-Bo cards or numbered cards

  // Count cards in build piles
  gameState.buildPiles.forEach(pile => {
    pile.forEach(card => {
      if ((card.isSkipBo && targetValue <= 12) || card.value === targetValue) {
        visibleCards++;
      }
    });
  });

  // Count cards in all players' discard piles
  gameState.players.forEach(player => {
    player.discardPiles.forEach(pile => {
      pile.forEach(card => {
        if ((card.isSkipBo && targetValue <= 12) || card.value === targetValue) {
          visibleCards++;
        }
      });
    });
  });

  // Count cards in current player's hand
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  currentPlayer.hand.filter(c => !!c).forEach(card => {
    if ((card.isSkipBo && targetValue <= 12) || card.value === targetValue) {
      visibleCards++;
    }
  });

  return {
    visible: visibleCards,
    remaining: Math.max(0, totalPossibleCards - visibleCards),
    scarcity: visibleCards / totalPossibleCards
  };
};

/**
 * Finds the best discard pile for a given card using strategic considerations
 * @param card The card to discard
 * @param discardPiles The player's discard piles
 * @param gameState Optional game state for advanced analysis
 * @returns The index of the best discard pile
 */
export const findBestDiscardPile = (
  card: Card, 
  discardPiles: Card[][],
  gameState?: GameState
): number => {
  // If strategic discard pile selection is disabled, use a simple approach
  if (!isFeatureEnabled('useStrategicDiscardPileSelection')) {
    // Just find the first empty pile or use the first pile
    for (let i = 0; i < discardPiles.length; i++) {
      if (discardPiles[i].length === 0) {
        return i;
      }
    }
    return 0;
  }
  
  // Get strategy weights from configuration
  const weights = getWeights();
  
  // Analyze game state if provided
  const opponentAnalysis = gameState ? analyzeOpponents(gameState) : null;
  const cardAnalysis = gameState ? analyzeCardAvailability(gameState, card.value) : null;

  // If we want to use a more sophisticated approach, score each pile
  const pileScores: number[] = discardPiles.map((pile) => {
    let score = 0;
    
    // Empty pile score
    if (pile.length === 0) {
      score += weights.emptyPilePreference;

      // Bonus for keeping piles organized when opponents are close to winning
      if (opponentAnalysis && opponentAnalysis.closestToWinning <= 5) {
        score += 3; // Prefer starting new organized piles under pressure
      }

      return score;
    }
    
    const topCard = pile[pile.length - 1];
    
    // Same value grouping - enhanced with scarcity consideration
    if (topCard.value === card.value) {
      score += weights.sameValueGrouping;

      // Bonus for grouping scarce cards
      if (cardAnalysis && cardAnalysis.scarcity > 0.6) {
        score += 2;
      }
    }
    
    // Sequential values - enhanced for building sequences
    if (Math.abs(topCard.value - card.value) === 1) {
      score += weights.sequentialValues;

      // Extra bonus for continuing longer sequences
      let sequenceLength = 1;
      for (let i = pile.length - 2; i >= 0; i--) {
        if (Math.abs(pile[i].value - pile[i + 1].value) === 1) {
          sequenceLength++;
        } else {
          break;
        }
      }
      score += sequenceLength * 0.5;
    }
    
    // Higher value preference (to preserve lower values for play)
    score += (topCard.value / 12) * weights.highValuePreference;
    
    // Penalty for very tall piles (harder to use later)
    if (pile.length > 8) {
      score -= 2;
    }

    return score;
  });
  
  // Find the pile with the highest score
  let bestPileIndex = 0;
  let bestScore = pileScores[0];
  
  for (let i = 1; i < pileScores.length; i++) {
    if (pileScores[i] > bestScore) {
      bestScore = pileScores[i];
      bestPileIndex = i;
    }
  }
  
  return bestPileIndex;
};

/**
 * Selects the best card to discard from the hand based on strategic value
 * @param hand The player's hand
 * @param gameState The current game state
 * @returns The index of the best card to discard
 */
export const selectCardToDiscard = (
  hand: (Card | null)[],
  gameState: GameState
): number => {
  // Skip-Bo cards should never be discarded
  const discardableCards = hand.filter(card => card && !card.isSkipBo);
  if (discardableCards.length === 0) {
    return -1; // No cards can be discarded
  }
  
  // If strategic card selection is disabled, just pick the first non-Skip-Bo card
  if (!isFeatureEnabled('useStrategicCardSelection')) {
    return hand.findIndex(card => card && !card.isSkipBo);
  }
  
  // Get strategy weights and analyze game state
  const weights = getWeights();
  const opponentAnalysis = analyzeOpponents(gameState);

  // Create a map of values that might be needed soon on build piles
  const neededValues = new Set<number>();
  gameState.buildPiles.forEach(pile => {
    if (pile.length > 0) {
      const nextNeeded = pile[pile.length - 1].value + 1;
      if (nextNeeded <= 12) {
        neededValues.add(nextNeeded);
      }
    } else {
      neededValues.add(1); // Empty piles need 1s
    }
  });
  
  // Score each card based on strategic value
  const cardScores: number[] = hand.map((card) => {
    // No card
    if (!card) {
      return -Infinity;
    }
    // Skip-Bo cards should never be discarded
    if (card.isSkipBo) {
      return -Infinity;
    }
    
    let score = 0;
    
    // Count duplicates of this value in hand
    const duplicateCount = hand.filter(c => c && !c.isSkipBo && c.value === card.value).length;
    if (duplicateCount > 1) {
      score += weights.duplicateCardPriority;

      // Extra bonus for discarding when we have many duplicates
      if (duplicateCount >= 3) {
        score += 2;
      }
    }
    
    // Enhanced penalty for discarding needed values
    if (neededValues.has(card.value)) {
      let penalty = weights.avoidNeededValues;

      // Increase penalty if opponents are close to winning
      if (opponentAnalysis.closestToWinning <= 3) {
        penalty *= 1.5;
      }

      // Analyze card scarcity
      const cardAnalysis = analyzeCardAvailability(gameState, card.value);
      if (cardAnalysis.remaining <= 2) {
        penalty *= 2; // Very scarce cards should almost never be discarded
      }

      score -= penalty;
    }

    // Bonus for higher value cards (harder to play) - but consider game phase
    let highValueBonus = (card.value / 12) * weights.highValueCardPriority;

    // Reduce high value preference if we're ahead (encourage more aggressive play)
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.stockPile.length < opponentAnalysis.avgStockPileSize) {
      highValueBonus *= 0.7;
    }
    
    score += highValueBonus;

    return score;
  });
  
  // Find the card with the highest score
  let bestCardIndex = -1;
  let bestScore = -Infinity;
  
  for (let i = 0; i < cardScores.length; i++) {
    if (cardScores[i] > bestScore) {
      bestScore = cardScores[i];
      bestCardIndex = i;
    }
  }
  
  // If no suitable card found (all Skip-Bo), return -1
  if (bestCardIndex === -1 || !hand[bestCardIndex] || hand[bestCardIndex]?.isSkipBo) {
    return -1;
  }
  
  return bestCardIndex;
};

/**
 * Evaluates a potential discard move and assigns a score
 * @param card The card to discard
 * @param discardPileIndex The discard pile index
 * @param gameState The current game state
 * @returns A score for the move (higher is better)
 */
export const evaluateDiscardMove = (
  card: Card, 
  discardPileIndex: number,
  gameState: GameState
): number => {
  // If look-ahead strategy is disabled, return a neutral score
  if (!isFeatureEnabled('useLookAheadStrategy')) {
    return 0;
  }
  
  // Get strategy weights from configuration
  const weights = getWeights();
  
  const playerIndex = gameState.currentPlayerIndex;
  const discardPiles = gameState.players[playerIndex].discardPiles;
  const pile = discardPiles[discardPileIndex];
  
  let score = 0;
  
  // Check if this discard would create a sequence in the discard pile
  if (pile.length > 0) {
    const topCard = pile[pile.length - 1];
    
    // Award points for creating groups or sequences
    if (topCard.value === card.value) {
      score += weights.sameValueScore; // Same value grouping
    } else if (Math.abs(topCard.value - card.value) === 1) {
      score += weights.sequentialValueScore; // Sequential values
    }
  }
  
  // Check if this discard would block a card needed for build piles
  const neededValues = new Set<number>();
  gameState.buildPiles.forEach(pile => {
    if (pile.length > 0) {
      const nextNeeded = pile[pile.length - 1].value + 1;
      if (nextNeeded <= 12) {
        neededValues.add(nextNeeded);
      }
    } else {
      neededValues.add(1);
    }
  });
  
  if (neededValues.has(card.value)) {
    score -= weights.neededValuePenalty; // Penalize discarding needed values
  }
  
  // Bonus for discarding high values (harder to play)
  score += card.value * weights.highValueBonus;
  
  // Penalize creating too many discard piles
  if (pile.length === 0) {
    score -= weights.newPilePenalty; // Starting a new pile
  }
  
  return score;
};

/**
 * Finds the best discard pile to play from based on strategic considerations
 * @param discardPiles The player's discard piles
 * @param buildPiles The build piles
 * @param gameState The current game state
 * @returns The indices of the best discard pile and build pile, or null if no play is possible
 */
export const findBestDiscardPileToPlayFrom = (
  discardPiles: Card[][], 
  buildPiles: Card[][],
  gameState: GameState
): { discardPileIndex: number; buildPileIndex: number } | null => {
  
  // If strategic discard pile play is disabled, use a simple approach
  if (!isFeatureEnabled('useStrategicDiscardPilePlay')) {
    // Just check each discard pile in order
    for (let discardPileIndex = 0; discardPileIndex < discardPiles.length; discardPileIndex++) {
      const pile = discardPiles[discardPileIndex];
      if (pile.length === 0) continue;
      
      const topCard = pile[pile.length - 1];
      
      // Check if this card can be played on any build pile
      for (let buildPileIndex = 0; buildPileIndex < buildPiles.length; buildPileIndex++) {
        if (canPlayCard(topCard, buildPileIndex, gameState)) {
          return { discardPileIndex, buildPileIndex };
        }
      }
    }
    
    return null; // No playable cards found
  }
  
  // Get strategy weights from configuration
  const weights = getWeights();
  
  // Create a list of all possible plays from discard piles
  const possiblePlays: Array<{
    discardPileIndex: number;
    buildPileIndex: number;
    score: number;
  }> = [];
  
  // Check each discard pile
  for (let discardPileIndex = 0; discardPileIndex < discardPiles.length; discardPileIndex++) {
    const pile = discardPiles[discardPileIndex];
    if (pile.length === 0) continue;

    const topCard = pile[pile.length - 1];

    // Check if this card can be played on any build pile
    for (let buildPileIndex = 0; buildPileIndex < buildPiles.length; buildPileIndex++) {
      if (canPlayCard(topCard, buildPileIndex, gameState)) {
        // Calculate a score for this play
        let score = 0;

        // Prioritize playing from larger piles to clear them
        score += pile.length * weights.largerPilePriority;

        // Bonus for completing a build pile
        const buildPile = buildPiles[buildPileIndex];
        if (buildPile.length === 11 || (buildPile.length > 0 && buildPile[buildPile.length - 1].value === 11)) {
          score += 10; // High bonus for completing
        }

        // Bonus for playing low-value cards that are harder to use later
        if (!topCard.isSkipBo && topCard.value <= 3) {
          score += 3;
        }

        possiblePlays.push({
          discardPileIndex,
          buildPileIndex,
          score
        });
      }
    }
  }

  // If no plays are possible, return null
  if (possiblePlays.length === 0) {
    return null;
  }

  // Sort plays by score (descending)
  possiblePlays.sort((a, b) => b.score - a.score);

  // Return the highest-scoring play
  return {
    discardPileIndex: possiblePlays[0].discardPileIndex,
    buildPileIndex: possiblePlays[0].buildPileIndex
  };
};
