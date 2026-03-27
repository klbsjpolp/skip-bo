import { Card, GameState } from '@/types';
import { canPlayCard } from '@/lib/validators';
import { getWeights } from './aiConfig';
import {
  collectNeededValues,
  countVisibleNaturalCards,
  countVisibleSkipBos,
  getAIPlayer,
  getNextBuildValue,
  getPlayableBuildPiles,
  getTopStockCard,
} from './strategyUtils';

const analyzeOpponents = (gameState: GameState, aiPlayerIndex: number = gameState.currentPlayerIndex) => {
  const opponents = gameState.players.filter((_, index) => index !== aiPlayerIndex);

  if (opponents.length === 0) {
    return {
      closestToWinning: Number.POSITIVE_INFINITY,
      avgStockPileSize: 0,
    };
  }

  return {
    closestToWinning: Math.min(...opponents.map((player) => player.stockPile.length)),
    avgStockPileSize:
      opponents.reduce((sum, player) => sum + player.stockPile.length, 0) / opponents.length,
  };
};

const analyzeCardAvailability = (gameState: GameState, targetValue: number) => {
  const totalNaturalCopies = 12;
  const visibleNatural = countVisibleNaturalCards(gameState, targetValue);
  const visibleWildcards = countVisibleSkipBos(gameState);

  return {
    visibleNatural,
    remainingNatural: Math.max(0, totalNaturalCopies - visibleNatural),
    visibleWildcards,
  };
};

const getSoonNeededValues = (gameState: GameState): Set<number> => collectNeededValues(gameState, 2);

const getValueBand = (value: number): number => {
  if (value <= 4) {
    return 0;
  }

  if (value <= 8) {
    return 1;
  }

  return 2;
};

const getStockBridgeUrgency = (card: Card, gameState: GameState): number => {
  if (card.isSkipBo) {
    return 0;
  }

  const stockCard = getTopStockCard(getAIPlayer(gameState));

  if (!stockCard || stockCard.isSkipBo || card.value >= stockCard.value) {
    return 0;
  }

  const gap = stockCard.value - card.value;

  if (gap === 1) {
    return 3;
  }

  if (gap === 2) {
    return 2;
  }

  if (gap === 3) {
    return 1;
  }

  return 0;
};

const isUsefulDiscardTop = (card: Card, gameState: GameState): boolean => {
  if (getPlayableBuildPiles(card, gameState).length > 0) {
    return true;
  }

  return getStockBridgeUrgency(card, gameState) > 0;
};

const scoreDiscardPlacement = (
  card: Card,
  discardPile: Card[],
  gameState: GameState
): number => {
  const weights = getWeights();
  let score = 0;

  if (discardPile.length === 0) {
    score += weights.emptyPileBonus - weights.newPilePenalty;
    return score;
  }

  const topCard = discardPile[discardPile.length - 1];
  const valueBandDistance = Math.abs(getValueBand(topCard.value) - getValueBand(card.value));
  let hasStrongMatch = false;

  if (topCard.value === card.value) {
    score += weights.sameValueDiscardPileBonus;
    hasStrongMatch = true;
  } else if (Math.abs(topCard.value - card.value) === 1) {
    score += weights.sequentialDiscardPileBonus;
    hasStrongMatch = true;
  }

  if (!hasStrongMatch) {
    if (valueBandDistance === 0) {
      score += weights.sameBandDiscardPileBonus;
    } else {
      score -= weights.mismatchedDiscardPilePenalty * valueBandDistance;
    }
  }

  if (isUsefulDiscardTop(topCard, gameState)) {
    score -= hasStrongMatch ? weights.buryUsefulCardPenalty / 2 : weights.buryUsefulCardPenalty;
  }

  if (discardPile.length > 8) {
    score -= 2;
  }

  return score;
};

export const findBestDiscardPile = (
  card: Card,
  discardPiles: Card[][],
  gameState: GameState
): number => {
  let bestPileIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  discardPiles.forEach((pile, pileIndex) => {
    const score = scoreDiscardPlacement(card, pile, gameState);

    if (score > bestScore) {
      bestScore = score;
      bestPileIndex = pileIndex;
    }
  });

  return bestPileIndex;
};

export const selectCardToDiscard = (
  hand: (Card | null)[],
  gameState: GameState
): number => {
  const weights = getWeights();
  const opponentAnalysis = analyzeOpponents(gameState);
  const neededSoonValues = getSoonNeededValues(gameState);

  let bestCardIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;

  hand.forEach((card, index) => {
    if (!card || card.isSkipBo) {
      return;
    }

    let score = 0;

    const duplicateCount = hand.filter(
      (candidate) => candidate && !candidate.isSkipBo && candidate.value === card.value
    ).length;

    if (duplicateCount > 1) {
      score += weights.duplicateDiscardBonus + (duplicateCount - 2);
    }

    if (neededSoonValues.has(card.value)) {
      score -= weights.neededSoonPenalty;
    }

    const stockBridgeUrgency = getStockBridgeUrgency(card, gameState);
    if (stockBridgeUrgency > 0) {
      score -= weights.stockBridgePenalty * stockBridgeUrgency;
    }

    const availability = analyzeCardAvailability(gameState, card.value);
    if (availability.remainingNatural <= 2) {
      score -= weights.neededSoonPenalty / 2;
    }

    if (getPlayableBuildPiles(card, gameState).length > 0) {
      score -= 4;
    }

    score += (card.value / 12) * weights.highValueDiscardBonus;

    if (opponentAnalysis.closestToWinning <= 3 && card.value <= 4) {
      score -= 4;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCardIndex = index;
    }
  });

  return bestCardIndex;
};

export const evaluateDiscardMove = (
  card: Card,
  discardPileIndex: number,
  gameState: GameState
): number => {
  const weights = getWeights();
  const opponentAnalysis = analyzeOpponents(gameState);
  const neededSoonValues = getSoonNeededValues(gameState);
  const discardPile = getAIPlayer(gameState).discardPiles[discardPileIndex];

  let score = scoreDiscardPlacement(card, discardPile, gameState);
  score += (card.value / 12) * weights.highValueDiscardBonus;

  if (neededSoonValues.has(card.value)) {
    score -= weights.neededSoonPenalty;
  }

  const stockBridgeUrgency = getStockBridgeUrgency(card, gameState);
  if (stockBridgeUrgency > 0) {
    score -= weights.stockBridgePenalty * stockBridgeUrgency;
  }

  if (opponentAnalysis.closestToWinning <= 3 && card.value <= 4) {
    score -= 4;
  }

  return score;
};

export const findBestDiscardPileToPlayFrom = (
  discardPiles: Card[][],
  buildPiles: Card[][],
  gameState: GameState
): { discardPileIndex: number; buildPileIndex: number } | null => {
  const weights = getWeights();
  const aiPlayer = getAIPlayer(gameState);
  const stockCard = getTopStockCard(aiPlayer);

  let bestPlay: { discardPileIndex: number; buildPileIndex: number; score: number } | null = null;

  for (let discardPileIndex = 0; discardPileIndex < discardPiles.length; discardPileIndex++) {
    const pile = discardPiles[discardPileIndex];

    if (pile.length === 0) {
      continue;
    }

    const topCard = pile[pile.length - 1];
    const revealedCard = pile[pile.length - 2] ?? null;

    for (let buildPileIndex = 0; buildPileIndex < buildPiles.length; buildPileIndex++) {
      const buildPile = buildPiles[buildPileIndex];

      if (!canPlayCard(topCard, buildPileIndex, gameState)) {
        continue;
      }

      let score = pile.length * weights.clearDiscardPileBonus + weights.playFromDiscardBonus;

      if (getNextBuildValue(buildPile) === 12) {
        score += weights.completePileBonus;
      }

      if (stockCard && !stockCard.isSkipBo && !topCard.isSkipBo && topCard.value < stockCard.value) {
        score += Math.max(0, 4 - (stockCard.value - topCard.value));
      }

      if (revealedCard) {
        if (getPlayableBuildPiles(revealedCard, gameState).length > 0) {
          score += weights.revealPlayableBonus;
        }

        const revealedBridgeUrgency = getStockBridgeUrgency(revealedCard, gameState);
        if (revealedBridgeUrgency > 0) {
          score += weights.revealStockBridgeBonus * revealedBridgeUrgency;
        }
      }

      if (bestPlay === null || score > bestPlay.score) {
        bestPlay = { discardPileIndex, buildPileIndex, score };
      }
    }
  }

  return bestPlay
    ? {
        discardPileIndex: bestPlay.discardPileIndex,
        buildPileIndex: bestPlay.buildPileIndex,
      }
    : null;
};
