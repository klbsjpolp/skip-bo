import {describe, expect, it} from 'vitest';

import {
  canPlayCard,
  createCoachInsightText,
  createPostGameSummaryInsightText,
  getBestAdviceRecommendation,
  getLegalAdviceRecommendations,
  initialGameState,
  type GameState,
  type InsightActionLogEntry,
} from '../src';

const createAdviceState = (): GameState => {
  const state = initialGameState();

  state.currentPlayerIndex = 0;
  state.buildPiles = [
    [],
    [{value: 1, isSkipBo: false}, {value: 2, isSkipBo: false}],
    [],
    [],
  ];
  state.players[0].stockPile = [{value: 3, isSkipBo: false}];
  state.players[0].hand = [
    {value: 1, isSkipBo: false},
    {value: 9, isSkipBo: false},
    null,
    {value: 9, isSkipBo: false},
    {value: 4, isSkipBo: true},
  ];
  state.players[0].discardPiles = [
    [{value: 2, isSkipBo: false}],
    [],
    [],
    [],
  ];
  state.selectedCard = null;

  return state;
};

describe('advice recommendations', () => {
  it('returns only legal play and discard recommendations for the current player', () => {
    const state = createAdviceState();
    const recommendations = getLegalAdviceRecommendations(state);

    expect(recommendations.length).toBeGreaterThan(0);

    recommendations.forEach((recommendation) => {
      if (recommendation.action === 'play') {
        expect(recommendation.card).toBeDefined();
        expect(recommendation.buildPileIndex).toBeDefined();
        expect(canPlayCard(recommendation.card!, recommendation.buildPileIndex!, state)).toBe(true);
      }

      if (recommendation.action === 'discard') {
        expect(recommendation.source).toBe('hand');
        expect(recommendation.card?.isSkipBo).toBe(false);
        expect(recommendation.discardPileIndex).toBeGreaterThanOrEqual(0);
      }
    });
  });

  it('prioritizes a playable stock card because it advances the win condition', () => {
    const state = createAdviceState();
    const recommendation = getBestAdviceRecommendation(state);

    expect(recommendation).toMatchObject({
      action: 'play',
      buildPileIndex: 1,
      source: 'stock',
      sourceIndex: 0,
    });
    expect(recommendation.reasonCodes).toContain('play-stock');
  });

  it('never recommends discarding a Skip-Bo card', () => {
    const state = createAdviceState();

    state.buildPiles = Array.from({length: state.config.BUILD_PILES_COUNT}, () => [
      {value: 1, isSkipBo: false},
      {value: 2, isSkipBo: false},
      {value: 3, isSkipBo: false},
    ]);
    state.players[0].stockPile = [{value: 12, isSkipBo: false}];
    state.players[0].hand = [
      null,
      {value: 8, isSkipBo: true},
      null,
      null,
      {value: 10, isSkipBo: false},
    ];

    const recommendations = getLegalAdviceRecommendations(state);

    expect(recommendations.some((recommendation) =>
      recommendation.action === 'discard' && recommendation.card?.isSkipBo,
    )).toBe(false);
    expect(recommendations.some((recommendation) =>
      recommendation.action === 'discard' && recommendation.sourceIndex === 4,
    )).toBe(true);
  });

  it('preserves fixed-length hands with null holes while evaluating advice', () => {
    const state = createAdviceState();
    const handBefore = [...state.players[0].hand];

    getBestAdviceRecommendation(state);

    expect(state.players[0].hand).toEqual(handBefore);
    expect(state.players[0].hand).toHaveLength(state.config.HAND_SIZE);
    expect(state.players[0].hand[2]).toBeNull();
  });

  it('formats a bounded coach line from deterministic recommendations', () => {
    const state = createAdviceState();
    const recommendation = getBestAdviceRecommendation(state);

    const text = createCoachInsightText(recommendation);

    expect(text).toBe('Coach: joue le 3 de ton talon vers la pile 2 - ça réduit directement ton talon.');
    expect(text.length).toBeLessThanOrEqual(140);
  });

  it('formats a personal post-game summary from the player action log', () => {
    const state = createAdviceState();
    const actionLog: InsightActionLogEntry[] = [
      {
        action: 'play',
        card: {value: 3, isSkipBo: false},
        playerIndex: 0,
        source: 'stock',
        sourceIndex: 0,
        stockCountAfter: 2,
        stockCountBefore: 3,
        version: 1,
      },
      {
        action: 'discard',
        card: {value: 9, isSkipBo: false},
        discardPileIndex: 1,
        playerIndex: 0,
        source: 'hand',
        sourceIndex: 1,
        stockCountAfter: 2,
        stockCountBefore: 2,
        version: 2,
      },
      {
        action: 'play',
        card: {value: 1, isSkipBo: false},
        playerIndex: 1,
        source: 'stock',
        sourceIndex: 0,
        stockCountAfter: 1,
        stockCountBefore: 2,
        version: 3,
      },
    ];

    state.gameIsOver = true;
    state.winnerIndex = 0;

    expect(createPostGameSummaryInsightText({
      actionLog,
      playerIndex: 0,
      winnerIndex: state.winnerIndex,
    })).toBe('Résumé: victoire en 2 coups - point fort: pression sur le talon; à travailler: chercher plus de coups de talon.');
  });
});
