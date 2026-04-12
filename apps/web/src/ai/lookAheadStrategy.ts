import type { Card, GameState } from '@/types';
import type { GameAction } from '@/state/gameActions';
import { gameReducer } from '@/state/gameReducer';
import { canPlayCard } from '@/lib/validators';
import { evaluateDiscardMove } from './discardUtils';
import { getRandomnessWindow, getWeights } from './aiConfig';
import {
  getAccessibleSkipBoCount,
  getAIPlayer,
  getClosestGapToStock,
  getPlayableBuildPiles,
  pickRandomNearBestOption,
  getTopStockCard,
} from './strategyUtils';

export interface MoveEvaluation {
  action: 'play' | 'discard' | 'end';
  score: number;
  source?: 'stock' | 'hand' | 'discard';
  sourceIndex?: number;
  sourceDiscardPileIndex?: number;
  buildPileIndex?: number;
  discardPileIndex?: number;
}

interface SearchResult {
  score: number;
  move: MoveEvaluation | null;
}

const STOCK_WIN_BONUS = 5000;

const getCardForMove = (gameState: GameState, move: MoveEvaluation): Card | null => {
  const aiPlayer = getAIPlayer(gameState);

  if (move.source === 'stock' && move.sourceIndex !== undefined) {
    return aiPlayer.stockPile[move.sourceIndex] ?? null;
  }

  if (move.source === 'hand' && move.sourceIndex !== undefined) {
    return aiPlayer.hand[move.sourceIndex] ?? null;
  }

  if (
    move.source === 'discard' &&
    move.sourceDiscardPileIndex !== undefined &&
    move.sourceIndex !== undefined
  ) {
    return aiPlayer.discardPiles[move.sourceDiscardPileIndex][move.sourceIndex] ?? null;
  }

  return null;
};

const createSelectAction = (move: MoveEvaluation): GameAction | null => {
  if (!move.source || move.sourceIndex === undefined) {
    return null;
  }

  return {
    type: 'SELECT_CARD',
    source: move.source,
    index: move.sourceIndex,
    discardPileIndex: move.sourceDiscardPileIndex,
    plannedBuildPileIndex: move.buildPileIndex,
    plannedDiscardPileIndex: move.discardPileIndex,
  };
};

const createResolutionAction = (move: MoveEvaluation): GameAction | null => {
  if (move.action === 'play' && move.buildPileIndex !== undefined) {
    return { type: 'PLAY_CARD', buildPile: move.buildPileIndex };
  }

  if (move.action === 'discard' && move.discardPileIndex !== undefined) {
    return { type: 'DISCARD_CARD', discardPile: move.discardPileIndex };
  }

  if (move.action === 'end') {
    return { type: 'END_TURN' };
  }

  return null;
};

const simulateResolvedMove = (gameState: GameState, move: MoveEvaluation): GameState => {
  const selectAction = createSelectAction(move);
  const resolutionAction = createResolutionAction(move);

  if (!selectAction || !resolutionAction) {
    return gameState;
  }

  const selectedState = gameReducer(gameState, selectAction);
  return gameReducer(selectedState, resolutionAction);
};

const sameSource = (
  move: MoveEvaluation,
  source: 'stock' | 'hand' | 'discard',
  sourceIndex: number,
  sourceDiscardPileIndex?: number
): boolean =>
  move.source === source &&
  move.sourceIndex === sourceIndex &&
  move.sourceDiscardPileIndex === sourceDiscardPileIndex;

const hasNaturalAlternativeForBuild = (
  gameState: GameState,
  move: MoveEvaluation
): boolean => {
  if (move.buildPileIndex === undefined) {
    return false;
  }

  const aiPlayer = getAIPlayer(gameState);

  const stockCard = getTopStockCard(aiPlayer);
  if (
    stockCard &&
    !stockCard.isSkipBo &&
    canPlayCard(stockCard, move.buildPileIndex, gameState) &&
    !sameSource(move, 'stock', aiPlayer.stockPile.length - 1)
  ) {
    return true;
  }

  for (let handIndex = 0; handIndex < aiPlayer.hand.length; handIndex++) {
    const handCard = aiPlayer.hand[handIndex];
    if (
      handCard &&
      !handCard.isSkipBo &&
      canPlayCard(handCard, move.buildPileIndex, gameState) &&
      !sameSource(move, 'hand', handIndex)
    ) {
      return true;
    }
  }

  for (let discardPileIndex = 0; discardPileIndex < aiPlayer.discardPiles.length; discardPileIndex++) {
    const discardPile = aiPlayer.discardPiles[discardPileIndex];
    const topCard = discardPile[discardPile.length - 1];

    if (
      topCard &&
      !topCard.isSkipBo &&
      canPlayCard(topCard, move.buildPileIndex, gameState) &&
      !sameSource(move, 'discard', discardPile.length - 1, discardPileIndex)
    ) {
      return true;
    }
  }

  return false;
};

const generatePlayMoves = (gameState: GameState): MoveEvaluation[] => {
  const aiPlayer = getAIPlayer(gameState);
  const moves: MoveEvaluation[] = [];

  const stockIndex = aiPlayer.stockPile.length - 1;
  const stockCard = getTopStockCard(aiPlayer);
  if (stockCard) {
    getPlayableBuildPiles(stockCard, gameState).forEach((buildPileIndex) => {
      moves.push({
        action: 'play',
        score: 0,
        source: 'stock',
        sourceIndex: stockIndex,
        buildPileIndex,
      });
    });
  }

  aiPlayer.hand.forEach((card, handIndex) => {
    if (!card) {
      return;
    }

    getPlayableBuildPiles(card, gameState).forEach((buildPileIndex) => {
      moves.push({
        action: 'play',
        score: 0,
        source: 'hand',
        sourceIndex: handIndex,
        buildPileIndex,
      });
    });
  });

  aiPlayer.discardPiles.forEach((discardPile, discardPileIndex) => {
    const topIndex = discardPile.length - 1;
    const topCard = discardPile[topIndex];

    if (!topCard) {
      return;
    }

    getPlayableBuildPiles(topCard, gameState).forEach((buildPileIndex) => {
      moves.push({
        action: 'play',
        score: 0,
        source: 'discard',
        sourceIndex: topIndex,
        sourceDiscardPileIndex: discardPileIndex,
        buildPileIndex,
      });
    });
  });

  return moves;
};

const generateDiscardMoves = (gameState: GameState): MoveEvaluation[] => {
  const aiPlayer = getAIPlayer(gameState);
  const moves: MoveEvaluation[] = [];

  aiPlayer.hand.forEach((card, handIndex) => {
    if (!card || card.isSkipBo) {
      return;
    }

    aiPlayer.discardPiles.forEach((_, discardPileIndex) => {
      moves.push({
        action: 'discard',
        score: 0,
        source: 'hand',
        sourceIndex: handIndex,
        discardPileIndex,
      });
    });
  });

  return moves;
};

const countPlayableTopDiscards = (gameState: GameState, playerIndex: number): number => {
  const player = getAIPlayer(gameState, playerIndex);

  return player.discardPiles.reduce((count, pile) => {
    const topCard = pile[pile.length - 1];

    if (!topCard) {
      return count;
    }

    return count + (getPlayableBuildPiles(topCard, gameState).length > 0 ? 1 : 0);
  }, 0);
};

const simulateOpponentStockPlay = (
  gameState: GameState,
  playerIndex: number,
  buildPileIndex: number
): GameState => {
  const opponent = getAIPlayer(gameState, playerIndex);
  const stockIndex = opponent.stockPile.length - 1;
  const simulationState = {
    ...gameState,
    currentPlayerIndex: playerIndex,
    selectedCard: null,
  };

  const selectedState = gameReducer(simulationState, {
    type: 'SELECT_CARD',
    source: 'stock',
    index: stockIndex,
    plannedBuildPileIndex: buildPileIndex,
  });

  return gameReducer(selectedState, {
    type: 'PLAY_CARD',
    buildPile: buildPileIndex,
  });
};

const getOpponentFollowUpThreat = (
  gameState: GameState,
  playerIndex: number,
  weights: ReturnType<typeof getWeights>
): number => {
  const opponent = getAIPlayer(gameState, playerIndex);
  const stockCard = getTopStockCard(opponent);

  if (!stockCard) {
    return 0;
  }

  const playableBuildPiles = getPlayableBuildPiles(stockCard, gameState);
  if (playableBuildPiles.length === 0) {
    return 0;
  }

  return playableBuildPiles.reduce((bestThreat, buildPileIndex) => {
    const simulatedState = simulateOpponentStockPlay(gameState, playerIndex, buildPileIndex);
    const simulatedOpponent = getAIPlayer(simulatedState, playerIndex);
    const nextStockCard = getTopStockCard(simulatedOpponent);

    let threat = countPlayableTopDiscards(simulatedState, playerIndex) * weights.opponentPlayableDiscardPenalty;

    if (nextStockCard && getPlayableBuildPiles(nextStockCard, simulatedState).length > 0) {
      threat += weights.opponentStockFollowUpPenalty;
    }

    return Math.max(bestThreat, threat);
  }, 0);
};

const getOpponentThreatPenalty = (
  gameState: GameState,
  aiPlayerIndex: number = gameState.currentPlayerIndex
): number => {
  const weights = getWeights();

  return gameState.players.reduce((penalty, player, playerIndex) => {
    if (playerIndex === aiPlayerIndex) {
      return penalty;
    }

    let playerPenalty = countPlayableTopDiscards(gameState, playerIndex) * weights.opponentPlayableDiscardPenalty;

    if (player.stockPile.length === 0) {
      return penalty + STOCK_WIN_BONUS;
    }

    const stockGap = getClosestGapToStock(gameState, playerIndex);

    if (stockGap === 0) {
      playerPenalty += weights.opponentStockPlayablePenalty;
      playerPenalty += getOpponentFollowUpThreat(gameState, playerIndex, weights);
    } else if (stockGap !== null && stockGap <= 2) {
      playerPenalty += (3 - stockGap) * weights.opponentNearStockPenalty;
    }

    return penalty + playerPenalty;
  }, 0);
};

const evaluateState = (
  gameState: GameState,
  aiPlayerIndex: number = gameState.currentPlayerIndex
): number => {
  const weights = getWeights();
  const aiPlayer = getAIPlayer(gameState, aiPlayerIndex);

  if (aiPlayer.stockPile.length === 0) {
    return STOCK_WIN_BONUS;
  }

  let score = -aiPlayer.stockPile.length * weights.stockStateBonus;
  score += getAccessibleSkipBoCount(aiPlayer) * weights.skipBoRetentionBonus;

  const stockCard = getTopStockCard(aiPlayer);
  if (stockCard) {
    if (getPlayableBuildPiles(stockCard, gameState).length > 0) {
      score += weights.playFromStockBonus;
    }

    const gapToStock = getClosestGapToStock(gameState, aiPlayerIndex);
    if (gapToStock !== null) {
      score -= gapToStock * weights.stockGapPenalty;
    }
  }

  aiPlayer.discardPiles.forEach((pile) => {
    const topCard = pile[pile.length - 1];
    if (!topCard) {
      return;
    }

    if (getPlayableBuildPiles(topCard, gameState).length > 0) {
      score += weights.playableTopDiscardBonus;
    }

    if (pile.length >= 2) {
      const nextCard = pile[pile.length - 2];
      if (nextCard.value === topCard.value || Math.abs(nextCard.value - topCard.value) === 1) {
        score += weights.discardOrganizationBonus;
      }
    }
  });

  const opponents = gameState.players.filter((_, index) => index !== aiPlayerIndex);
  if (opponents.length > 0) {
    const closestOpponentStock = Math.min(...opponents.map((player) => player.stockPile.length));
    score -= Math.max(0, 6 - closestOpponentStock) * weights.opponentPressurePenalty;
  }

  score -= getOpponentThreatPenalty(gameState, aiPlayerIndex);

  return score;
};

const evaluateMove = (
  gameState: GameState,
  move: MoveEvaluation,
  nextState: GameState,
  aiPlayerIndex: number
): number => {
  const weights = getWeights();
  const card = getCardForMove(gameState, move);
  let score = 0;

  if (move.action === 'play') {
    if (move.source === 'stock') {
      score += weights.playFromStockBonus;
    }

    if (move.source === 'discard') {
      score += weights.playFromDiscardBonus;
      if (move.sourceDiscardPileIndex !== undefined) {
        const sourcePile = getAIPlayer(gameState, aiPlayerIndex).discardPiles[move.sourceDiscardPileIndex];
        const revealedCard = sourcePile[sourcePile.length - 2];

        if (revealedCard) {
          if (getPlayableBuildPiles(revealedCard, nextState).length > 0) {
            score += weights.revealPlayableBonus;
          }

          const nextStockCard = getTopStockCard(getAIPlayer(nextState, aiPlayerIndex));
          if (
            nextStockCard &&
            !nextStockCard.isSkipBo &&
            !revealedCard.isSkipBo &&
            revealedCard.value < nextStockCard.value
          ) {
            const gap = nextStockCard.value - revealedCard.value;
            if (gap >= 1 && gap <= 2) {
              score += weights.revealStockBridgeBonus * (3 - gap);
            }
          }
        }
      }
    }

    if (move.buildPileIndex !== undefined) {
      const buildPile = gameState.buildPiles[move.buildPileIndex];
      if (buildPile.length === 11) {
        score += weights.completePileBonus;
      }
    }

    if (card?.isSkipBo) {
      score -= weights.useSkipBoPenalty;

      if (hasNaturalAlternativeForBuild(gameState, move)) {
        score -= weights.redundantSkipBoPenalty;
      }
    }

    const beforeGap = getClosestGapToStock(gameState, aiPlayerIndex);
    const afterGap = getClosestGapToStock(nextState, aiPlayerIndex);
    if (beforeGap !== null && afterGap !== null && afterGap < beforeGap) {
      score += (beforeGap - afterGap) * weights.stockGapPenalty * 2;
    }

    const beforeOpponentThreat = getOpponentThreatPenalty(gameState, aiPlayerIndex);
    const afterOpponentThreat = getOpponentThreatPenalty(nextState, aiPlayerIndex);
    if (afterOpponentThreat < beforeOpponentThreat) {
      score += beforeOpponentThreat - afterOpponentThreat;
    }
  }

  if (move.action === 'discard' && card && move.discardPileIndex !== undefined) {
    score += evaluateDiscardMove(card, move.discardPileIndex, gameState);
  }

  return score;
};

const searchTurn = (
  gameState: GameState,
  aiPlayerIndex: number,
  depth: number
): SearchResult => {
  if (depth <= 0 || gameState.gameIsOver) {
    return { score: evaluateState(gameState, aiPlayerIndex), move: null };
  }

  const playMoves = generatePlayMoves(gameState);
  const discardMoves = generateDiscardMoves(gameState);

  const rankedDiscardMoves = discardMoves
    .map((move) => {
      const card = getCardForMove(gameState, move);
      return {
        move,
        score:
          card && move.discardPileIndex !== undefined
            ? evaluateDiscardMove(card, move.discardPileIndex, gameState)
            : Number.NEGATIVE_INFINITY,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ move }) => move);

  const candidateMoves = [...playMoves, ...rankedDiscardMoves];

  if (candidateMoves.length === 0) {
    return {
      score: evaluateState(gameState, aiPlayerIndex) - 5,
      move: { action: 'end', score: 0 },
    };
  }

  const scoredMoves: Array<{ option: MoveEvaluation; score: number }> = [];

  candidateMoves.forEach((move) => {
    const nextState = simulateResolvedMove(gameState, move);
    const localScore = evaluateMove(gameState, move, nextState, aiPlayerIndex);
    const futureScore =
      move.action === 'play' && !nextState.gameIsOver
        ? searchTurn(nextState, aiPlayerIndex, depth - 1).score
        : evaluateState(nextState, aiPlayerIndex);
    const totalScore = localScore + futureScore;

    scoredMoves.push({
      option: { ...move, score: totalScore },
      score: totalScore,
    });
  });

  const selectedMove = pickRandomNearBestOption(
    scoredMoves,
    getRandomnessWindow('searchScoreWindow')
  );

  return {
    score: selectedMove?.score ?? Number.NEGATIVE_INFINITY,
    move: selectedMove?.option ?? null,
  };
};

export const lookAheadEvaluation = (
  gameState: GameState,
  depth: number = 4
): MoveEvaluation | null => {
  const aiPlayer = getAIPlayer(gameState);

  if (!aiPlayer.isAI) {
    return null;
  }

  return searchTurn(gameState, gameState.currentPlayerIndex, depth).move;
};
