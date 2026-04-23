import type {Card, GameState} from '../types';
import {canPlayCard} from './validators.js';

export type AdviceAction = 'play' | 'discard' | 'end';
export type AdviceCardSource = 'stock' | 'hand' | 'discard';
export type AdviceReasonCode =
  | 'play-stock'
  | 'play-discard'
  | 'play-hand'
  | 'complete-build-pile'
  | 'preserve-skip-bo'
  | 'discard-duplicate'
  | 'discard-high-card'
  | 'organize-discard-pile'
  | 'no-legal-move';

export interface AdviceRecommendation {
  action: AdviceAction;
  buildPileIndex?: number;
  card?: Card;
  discardPileIndex?: number;
  reasonCodes: AdviceReasonCode[];
  score: number;
  source?: AdviceCardSource;
  sourceDiscardPileIndex?: number;
  sourceIndex?: number;
}

export interface InsightActionLogEntry {
  action: 'play' | 'discard';
  buildPileIndex?: number;
  card?: Card;
  completedBuildPile?: boolean;
  discardPileIndex?: number;
  playerIndex: number;
  source: AdviceCardSource;
  sourceDiscardPileIndex?: number;
  sourceIndex?: number;
  stockCountAfter: number;
  stockCountBefore: number;
  version: number;
}

interface PostGameSummaryInsightInput {
  actionLog: InsightActionLogEntry[];
  playerIndex: number;
  winnerIndex: number | null;
}

interface ScoredRecommendation extends AdviceRecommendation {
  sortIndex: number;
}

const INSIGHT_TEXT_LIMIT = 140;

const cloneCard = (card: Card): Card => ({...card});

export const truncateInsightText = (text: string): string => {
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  if (normalizedText.length <= INSIGHT_TEXT_LIMIT) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, INSIGHT_TEXT_LIMIT - 3).trimEnd()}...`;
};

const getTopDiscardCard = (discardPile: Card[]): Card | null =>
  discardPile[discardPile.length - 1] ?? null;

const hasNaturalAlternativeForBuild = (
  card: Card,
  buildPileIndex: number,
  player: GameState['players'][number],
  gameState: GameState,
): boolean => {
  if (!card.isSkipBo) {
    return false;
  }

  const isNaturalPlayable = (candidate: Card | null | undefined): boolean =>
    Boolean(candidate && !candidate.isSkipBo && canPlayCard(candidate, buildPileIndex, gameState));

  if (isNaturalPlayable(player.stockPile[player.stockPile.length - 1])) {
    return true;
  }

  if (player.hand.some(isNaturalPlayable)) {
    return true;
  }

  return player.discardPiles.some((discardPile) => isNaturalPlayable(getTopDiscardCard(discardPile)));
};

const scorePlay = (
  source: AdviceCardSource,
  card: Card,
  buildPileIndex: number,
  gameState: GameState,
  player: GameState['players'][number],
): Pick<AdviceRecommendation, 'reasonCodes' | 'score'> => {
  const buildPile = gameState.buildPiles[buildPileIndex];
  const reasonCodes: AdviceReasonCode[] = [];
  let score = buildPile.length;

  if (source === 'stock') {
    score += 1000;
    reasonCodes.push('play-stock');
  } else if (source === 'discard') {
    score += 260;
    reasonCodes.push('play-discard');
  } else {
    score += 120;
    reasonCodes.push('play-hand');
  }

  if (buildPile.length === gameState.config.CARD_VALUES_MAX - 1) {
    score += 180;
    reasonCodes.push('complete-build-pile');
  }

  if (card.isSkipBo && hasNaturalAlternativeForBuild(card, buildPileIndex, player, gameState)) {
    score -= 80;
    reasonCodes.push('preserve-skip-bo');
  }

  return {reasonCodes, score};
};

const scoreDiscard = (
  card: Card,
  discardPileIndex: number,
  gameState: GameState,
  player: GameState['players'][number],
): Pick<AdviceRecommendation, 'reasonCodes' | 'score'> => {
  const discardPile = player.discardPiles[discardPileIndex];
  const topCard = getTopDiscardCard(discardPile);
  const reasonCodes: AdviceReasonCode[] = [];
  let score = 10 + card.value;

  const duplicateCount = player.hand.filter(
    (candidate) => candidate && !candidate.isSkipBo && candidate.value === card.value,
  ).length;

  if (duplicateCount > 1) {
    score += 35;
    reasonCodes.push('discard-duplicate');
  }

  if (card.value >= 9) {
    score += 12;
    reasonCodes.push('discard-high-card');
  }

  if (topCard) {
    if (topCard.value === card.value) {
      score += 45;
      reasonCodes.push('organize-discard-pile');
    } else if (Math.abs(topCard.value - card.value) === 1) {
      score += 28;
      reasonCodes.push('organize-discard-pile');
    } else {
      score -= Math.abs(topCard.value - card.value);
    }
  } else {
    score += 8;
  }

  const neededNow = gameState.buildPiles.some((_, buildPileIndex) =>
    canPlayCard(card, buildPileIndex, gameState),
  );

  if (neededNow) {
    score -= 80;
  }

  return {reasonCodes, score};
};

const createPlayRecommendations = (
  gameState: GameState,
  player: GameState['players'][number],
): ScoredRecommendation[] => {
  const recommendations: ScoredRecommendation[] = [];
  let sortIndex = 0;

  const addPlayRecommendations = (
    source: AdviceCardSource,
    card: Card | null | undefined,
    sourceIndex: number,
    sourceDiscardPileIndex?: number,
  ) => {
    if (!card) {
      return;
    }

    gameState.buildPiles.forEach((_, buildPileIndex) => {
      if (!canPlayCard(card, buildPileIndex, gameState)) {
        return;
      }

      const {reasonCodes, score} = scorePlay(source, card, buildPileIndex, gameState, player);
      recommendations.push({
        action: 'play',
        buildPileIndex,
        card: cloneCard(card),
        reasonCodes,
        score,
        sortIndex,
        source,
        sourceDiscardPileIndex,
        sourceIndex,
      });
      sortIndex += 1;
    });
  };

  addPlayRecommendations('stock', player.stockPile[player.stockPile.length - 1], player.stockPile.length - 1);

  player.hand.forEach((card, handIndex) => {
    addPlayRecommendations('hand', card, handIndex);
  });

  player.discardPiles.forEach((discardPile, discardPileIndex) => {
    addPlayRecommendations(
      'discard',
      getTopDiscardCard(discardPile),
      discardPile.length - 1,
      discardPileIndex,
    );
  });

  return recommendations;
};

const createDiscardRecommendations = (
  gameState: GameState,
  player: GameState['players'][number],
): ScoredRecommendation[] => {
  const recommendations: ScoredRecommendation[] = [];
  let sortIndex = 10_000;

  player.hand.forEach((card, handIndex) => {
    if (!card || card.isSkipBo) {
      return;
    }

    player.discardPiles.forEach((_, discardPileIndex) => {
      const {reasonCodes, score} = scoreDiscard(card, discardPileIndex, gameState, player);
      recommendations.push({
        action: 'discard',
        card: cloneCard(card),
        discardPileIndex,
        reasonCodes,
        score,
        sortIndex,
        source: 'hand',
        sourceIndex: handIndex,
      });
      sortIndex += 1;
    });
  });

  return recommendations;
};

export const getLegalAdviceRecommendations = (
  gameState: GameState,
  playerIndex: number = gameState.currentPlayerIndex,
): AdviceRecommendation[] => {
  const player = gameState.players[playerIndex];

  if (!player || gameState.gameIsOver) {
    return [];
  }

  const scopedGameState =
    gameState.currentPlayerIndex === playerIndex
      ? gameState
      : {
          ...gameState,
          currentPlayerIndex: playerIndex,
          selectedCard: null,
        };

  return [
    ...createPlayRecommendations(scopedGameState, player),
    ...createDiscardRecommendations(scopedGameState, player),
  ]
    .sort((left, right) => right.score - left.score || left.sortIndex - right.sortIndex)
    .map(({sortIndex: _sortIndex, ...recommendation}) => recommendation);
};

export const getBestAdviceRecommendation = (
  gameState: GameState,
  playerIndex: number = gameState.currentPlayerIndex,
): AdviceRecommendation => {
  const recommendations = getLegalAdviceRecommendations(gameState, playerIndex);

  return recommendations[0] ?? {
    action: 'end',
    reasonCodes: ['no-legal-move'],
    score: 0,
  };
};

const getCardLabel = (recommendation: AdviceRecommendation): string => {
  if (!recommendation.card) {
    return 'cette carte';
  }

  return recommendation.card.isSkipBo ? 'Skip-Bo' : `le ${recommendation.card.value}`;
};

const getSourceLabel = (recommendation: AdviceRecommendation): string => {
  if (recommendation.source === 'stock') {
    return 'de ton talon';
  }

  if (recommendation.source === 'discard') {
    return `de ta défausse ${(recommendation.sourceDiscardPileIndex ?? 0) + 1}`;
  }

  return 'de ta main';
};

const getReasonLabel = (recommendation: AdviceRecommendation): string => {
  if (recommendation.reasonCodes.includes('play-stock')) {
    return 'ça réduit directement ton talon';
  }

  if (recommendation.reasonCodes.includes('complete-build-pile')) {
    return 'ça complète une pile de construction';
  }

  if (recommendation.reasonCodes.includes('play-discard')) {
    return 'ça libère une défausse utile';
  }

  if (recommendation.reasonCodes.includes('discard-duplicate')) {
    return 'tu gardes plus de flexibilité';
  }

  if (recommendation.reasonCodes.includes('organize-discard-pile')) {
    return 'ça garde tes défausses lisibles';
  }

  return 'c’est le meilleur coup légal trouvé';
};

export const createCoachInsightText = (recommendation: AdviceRecommendation): string => {
  if (recommendation.action === 'play') {
    return truncateInsightText(
      `Coach: joue ${getCardLabel(recommendation)} ${getSourceLabel(recommendation)} vers la pile ${(recommendation.buildPileIndex ?? 0) + 1} - ${getReasonLabel(recommendation)}.`,
    );
  }

  if (recommendation.action === 'discard') {
    return truncateInsightText(
      `Coach: défausse ${getCardLabel(recommendation)} sur la pile ${(recommendation.discardPileIndex ?? 0) + 1} - ${getReasonLabel(recommendation)}.`,
    );
  }

  return 'Coach: aucun coup légal clair; termine ton tour si tu es bloqué.';
};

export const createPostGameSummaryInsightText = ({
  actionLog,
  playerIndex,
  winnerIndex,
}: PostGameSummaryInsightInput): string => {
  const ownActions = actionLog.filter((entry) => entry.playerIndex === playerIndex);
  const stockPlays = ownActions.filter((entry) => entry.action === 'play' && entry.source === 'stock').length;
  const discards = ownActions.filter((entry) => entry.action === 'discard').length;
  const won = winnerIndex === playerIndex;
  const strength = stockPlays > 0 ? 'pression sur le talon' : 'patience dans le tempo';
  const improvement = discards > stockPlays ? 'mieux préparer les défausses' : 'chercher plus de coups de talon';

  return truncateInsightText(
    `Résumé: ${won ? 'victoire' : 'défaite'} en ${ownActions.length} coups - point fort: ${strength}; à travailler: ${improvement}.`,
  );
};
