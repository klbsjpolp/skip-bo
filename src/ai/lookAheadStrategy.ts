import { GameState, Card } from '@/types';
import { canPlayCard } from '@/lib/validators';
import { getWeights } from './aiConfig';

interface MoveEvaluation {
  action: 'play' | 'discard';
  score: number;
  source: 'stock' | 'hand' | 'discard';
  sourceIndex?: number;
  discardPileIndex?: number;
  buildPileIndex?: number;
  cardValue?: number;
}

/**
 * Evaluates potential future game states after a move
 * @param gameState Current game state
 * @param depth How many moves ahead to look
 * @returns Best evaluated move with score
 */
export const lookAheadEvaluation = (
  gameState: GameState,
  depth: number = 2
): MoveEvaluation | null => {
  const aiPlayer = gameState.players[gameState.currentPlayerIndex];

  if (!aiPlayer.isAI || depth <= 0) {
    return null;
  }

  const possibleMoves: MoveEvaluation[] = [];

  // Evaluate stock pile moves
  if (aiPlayer.stockPile.length > 0) {
    const stockCard = aiPlayer.stockPile[aiPlayer.stockPile.length - 1];

    // Try playing stock card on each build pile
    for (let buildPile = 0; buildPile < gameState.buildPiles.length; buildPile++) {
      if (canPlayCard(stockCard, buildPile, gameState)) {
        const score = evaluatePlayMove(stockCard, buildPile, gameState, 'stock');
        possibleMoves.push({
          action: 'play',
          score,
          source: 'stock',
          sourceIndex: aiPlayer.stockPile.length - 1,
          buildPileIndex: buildPile,
          cardValue: stockCard.value
        });
      }
    }
  }

  // Evaluate hand moves
  aiPlayer.hand.forEach((handCard, handIndex) => {
    // Try playing on build piles
    for (let buildPile = 0; buildPile < gameState.buildPiles.length; buildPile++) {
      if (canPlayCard(handCard, buildPile, gameState)) {
        const score = evaluatePlayMove(handCard, buildPile, gameState, 'hand');
        possibleMoves.push({
          action: 'play',
          score,
          source: 'hand',
          sourceIndex: handIndex,
          buildPileIndex: buildPile,
          cardValue: handCard.value
        });
      }
    }

    // Try discarding (only non-Skip-Bo cards)
    if (!handCard.isSkipBo) {
      for (let discardPile = 0; discardPile < aiPlayer.discardPiles.length; discardPile++) {
        const score = evaluateDiscardMoveInternal(handCard, discardPile, gameState);
        possibleMoves.push({
          action: 'discard',
          score,
          source: 'hand',
          sourceIndex: handIndex,
          discardPileIndex: discardPile,
          cardValue: handCard.value
        });
      }
    }
  });

  // Evaluate discard pile moves
  aiPlayer.discardPiles.forEach((pile, discardPileIndex) => {
    if (pile.length === 0) return;

    const topCard = pile[pile.length - 1];
    for (let buildPile = 0; buildPile < gameState.buildPiles.length; buildPile++) {
      if (canPlayCard(topCard, buildPile, gameState)) {
        const score = evaluatePlayMove(topCard, buildPile, gameState, 'discard');
        possibleMoves.push({
          action: 'play',
          score,
          source: 'discard',
          sourceIndex: pile.length - 1,
          discardPileIndex,
          buildPileIndex: buildPile,
          cardValue: topCard.value
        });
      }
    }
  });

  if (possibleMoves.length === 0) {
    return null;
  }

  // Sort by score and return the best move
  possibleMoves.sort((a, b) => b.score - a.score);
  return possibleMoves[0];
};

/**
 * Evaluates the strategic value of playing a card
 */
function evaluatePlayMove(
  card: Card,
  buildPileIndex: number,
  gameState: GameState,
  source: 'stock' | 'hand' | 'discard'
): number {
  const weights = getWeights();
  let score = 0;

  // Base score for playing a card (always positive)
  score += 10;

  // Bonus for playing from stock pile (highest priority)
  if (source === 'stock') {
    score += 20;
  }

  // Bonus for completing a build pile (reaching 12)
  const buildPile = gameState.buildPiles[buildPileIndex];
  if (buildPile.length > 0 && buildPile[buildPile.length - 1].value === 11 && !buildPile[buildPile.length - 1].isSkipBo) {
    if (card.value === 12 || card.isSkipBo) {
      score += 15; // High bonus for completing a pile
    }
  }

  // Bonus for playing Skip-Bo cards strategically
  if (card.isSkipBo) {
    // Prefer using Skip-Bo to fill gaps or complete sequences
    if (buildPile.length > 0) {
      const nextExpected = buildPile[buildPile.length - 1].value + 1;
      if (nextExpected > 12) {
        score += 8; // Good use of Skip-Bo to complete pile
      } else if (nextExpected >= 10) {
        score += 5; // Decent use for high values
      }
    } else {
      score += 3; // Using Skip-Bo as 1
    }
  }

  // Penalty for playing low-value cards early (save them for later)
  if (!card.isSkipBo && card.value <= 3 && buildPile.length < 5) {
    score -= 2;
  }

  return score;
}

/**
 * Evaluates the strategic value of discarding a card (internal function)
 */
function evaluateDiscardMoveInternal(
  card: Card,
  discardPileIndex: number,
  gameState: GameState
): number {
  const weights = getWeights();
  const aiPlayer = gameState.players[gameState.currentPlayerIndex];
  const pile = aiPlayer.discardPiles[discardPileIndex];

  let score = 0;

  // Base penalty for discarding (we prefer playing)
  score -= 5;

  // Check what values are needed on build piles
  const neededValues = new Set<number>();
  gameState.buildPiles.forEach(buildPile => {
    if (buildPile.length > 0) {
      const nextNeeded = buildPile[buildPile.length - 1].value + 1;
      if (nextNeeded <= 12) {
        neededValues.add(nextNeeded);
      }
    } else {
      neededValues.add(1);
    }
  });

  // Heavy penalty for discarding needed values
  if (neededValues.has(card.value)) {
    score -= weights.neededValuePenalty;
  }

  // Group similar values together
  if (pile.length > 0) {
    const topCard = pile[pile.length - 1];
    if (topCard.value === card.value) {
      score += weights.sameValueScore;
    } else if (Math.abs(topCard.value - card.value) === 1) {
      score += weights.sequentialValueScore;
    }
  }

  // Prefer discarding higher values (harder to play later)
  score += (card.value / 12) * weights.highValueBonus;

  // Small penalty for starting a new pile
  if (pile.length === 0) {
    score -= weights.newPilePenalty;
  }

  return score;
}

/**
 * Simulates a game state after making a move (simplified)
 */
export const simulateMove = (
  gameState: GameState,
  move: MoveEvaluation
): GameState => {
  // Create a deep copy of the game state
  const newState = JSON.parse(JSON.stringify(gameState)) as GameState;
  const player = newState.players[newState.currentPlayerIndex];

  if (move.action === 'play' && move.buildPileIndex !== undefined) {
    // Simulate playing a card
    const buildPile = newState.buildPiles[move.buildPileIndex];

    if (move.source === 'stock' && move.sourceIndex !== undefined) {
      const card = player.stockPile.splice(move.sourceIndex, 1)[0];
      buildPile.push(card);
    } else if (move.source === 'hand' && move.sourceIndex !== undefined) {
      const card = player.hand.splice(move.sourceIndex, 1)[0];
      buildPile.push(card);
    } else if (move.source === 'discard' && move.discardPileIndex !== undefined && move.sourceIndex !== undefined) {
      const card = player.discardPiles[move.discardPileIndex].splice(move.sourceIndex, 1)[0];
      buildPile.push(card);
    }

    // Check if build pile is complete (reached 12)
    if (buildPile.length === 12) {
      newState.buildPiles[move.buildPileIndex] = [];
    }
  } else if (move.action === 'discard' && move.discardPileIndex !== undefined && move.sourceIndex !== undefined) {
    // Simulate discarding a card
    const card = player.hand.splice(move.sourceIndex, 1)[0];
    player.discardPiles[move.discardPileIndex].push(card);
  }

  return newState;
};
