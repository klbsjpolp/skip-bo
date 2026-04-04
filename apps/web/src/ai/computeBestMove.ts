import type { GameState } from '@/types';
import type { GameAction } from '@/state/gameActions';
import { canPlayCard } from '@/lib/validators';
import {
  findBestDiscardPile,
  findBestDiscardPileToPlayFrom,
  selectCardToDiscard,
} from './discardUtils';
import { getDelay, getRandomnessWindow, getSearchDepth } from './aiConfig';
import type { MoveEvaluation} from './lookAheadStrategy';
import { lookAheadEvaluation } from './lookAheadStrategy';
import { pickRandomNearBestOption } from './strategyUtils';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const chooseBestBuildPile = (gameState: GameState): number | null => {
  const selectedCard = gameState.selectedCard;

  if (!selectedCard) {
    return null;
  }

  const scoredBuildPiles: Array<{ option: number; score: number }> = [];

  gameState.buildPiles.forEach((buildPile, buildPileIndex) => {
    if (!canPlayCard(selectedCard.card, buildPileIndex, gameState)) {
      return;
    }

    let score = buildPile.length;

    if (buildPile.length === 11) {
      score += 50;
    }

    if (selectedCard.card.isSkipBo) {
      score += buildPile.length;
    }

    scoredBuildPiles.push({ option: buildPileIndex, score });
  });

  return (
    pickRandomNearBestOption(scoredBuildPiles, getRandomnessWindow('buildPileScoreWindow'))?.option ??
    null
  );
};

const selectionActionFromMove = (move: MoveEvaluation): GameAction | null => {
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

export const computeBestMove = async (gameState: GameState): Promise<GameAction> => {
  const aiPlayer = gameState.players[gameState.currentPlayerIndex];

  if (!aiPlayer.isAI || gameState.gameIsOver) {
    return { type: 'END_TURN' };
  }

  if (gameState.selectedCard) {
    await delay(getDelay('afterCardSelection'));

    const { selectedCard } = gameState;

    if (
      selectedCard.plannedBuildPileIndex !== undefined &&
      canPlayCard(selectedCard.card, selectedCard.plannedBuildPileIndex, gameState)
    ) {
      return { type: 'PLAY_CARD', buildPile: selectedCard.plannedBuildPileIndex };
    }

    if (
      selectedCard.source === 'hand' &&
      !selectedCard.card.isSkipBo &&
      selectedCard.plannedDiscardPileIndex !== undefined
    ) {
      return { type: 'DISCARD_CARD', discardPile: selectedCard.plannedDiscardPileIndex };
    }

    const fallbackBuildPile = chooseBestBuildPile(gameState);
    if (fallbackBuildPile !== null) {
      return { type: 'PLAY_CARD', buildPile: fallbackBuildPile };
    }

    if (selectedCard.source === 'hand' && !selectedCard.card.isSkipBo) {
      return {
        type: 'DISCARD_CARD',
        discardPile: findBestDiscardPile(selectedCard.card, aiPlayer.discardPiles, gameState),
      };
    }

    return { type: 'CLEAR_SELECTION' };
  }

  await delay(getDelay('beforeMove'));

  const bestMove = lookAheadEvaluation(gameState, getSearchDepth());
  if (bestMove) {
    const action = selectionActionFromMove(bestMove);
    if (action) {
      return action;
    }

    if (bestMove.action === 'end') {
      return { type: 'END_TURN' };
    }
  }

  if (aiPlayer.stockPile.length > 0) {
    const stockIndex = aiPlayer.stockPile.length - 1;
    const stockCard = aiPlayer.stockPile[stockIndex];
    const playableBuildPiles = gameState.buildPiles.reduce<Array<{ option: number; score: number }>>(
      (options, buildPile, index) => {
        if (canPlayCard(stockCard, index, gameState)) {
          options.push({
            option: index,
            score: buildPile.length === 11 ? 50 : buildPile.length,
          });
        }

        return options;
      },
      []
    );
    const buildPileIndex = pickRandomNearBestOption(
      playableBuildPiles,
      getRandomnessWindow('buildPileScoreWindow')
    )?.option;

    if (buildPileIndex !== undefined) {
      return {
        type: 'SELECT_CARD',
        source: 'stock',
        index: stockIndex,
        plannedBuildPileIndex: buildPileIndex,
      };
    }
  }

  for (let handIndex = 0; handIndex < aiPlayer.hand.length; handIndex++) {
    const handCard = aiPlayer.hand[handIndex];
    if (!handCard) {
      continue;
    }

    const playableBuildPiles = gameState.buildPiles.reduce<Array<{ option: number; score: number }>>(
      (options, buildPile, index) => {
        if (canPlayCard(handCard, index, gameState)) {
          let score = buildPile.length;

          if (buildPile.length === 11) {
            score += 50;
          }

          options.push({ option: index, score });
        }

        return options;
      },
      []
    );
    const buildPileIndex = pickRandomNearBestOption(
      playableBuildPiles,
      getRandomnessWindow('buildPileScoreWindow')
    )?.option;

    if (buildPileIndex !== undefined) {
      return {
        type: 'SELECT_CARD',
        source: 'hand',
        index: handIndex,
        plannedBuildPileIndex: buildPileIndex,
      };
    }
  }

  const bestDiscardPlay = findBestDiscardPileToPlayFrom(
    aiPlayer.discardPiles,
    gameState.buildPiles,
    gameState
  );
  if (bestDiscardPlay) {
    const discardPile = aiPlayer.discardPiles[bestDiscardPlay.discardPileIndex];
    return {
      type: 'SELECT_CARD',
      source: 'discard',
      index: discardPile.length - 1,
      discardPileIndex: bestDiscardPlay.discardPileIndex,
      plannedBuildPileIndex: bestDiscardPlay.buildPileIndex,
    };
  }

  const discardCardIndex = selectCardToDiscard(aiPlayer.hand, gameState);
  if (discardCardIndex !== -1) {
    const card = aiPlayer.hand[discardCardIndex];
    if (card) {
      return {
        type: 'SELECT_CARD',
        source: 'hand',
        index: discardCardIndex,
        plannedDiscardPileIndex: findBestDiscardPile(card, aiPlayer.discardPiles, gameState),
      };
    }
  }

  return { type: 'END_TURN' };
};
