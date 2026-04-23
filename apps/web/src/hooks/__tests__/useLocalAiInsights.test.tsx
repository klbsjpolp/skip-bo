import {renderHook, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {initialGameState, type GameState, type InsightActionLogEntry} from '@skipbo/game-core';

import {useLocalAiInsights} from '@/hooks/useLocalAiInsights';
import {requestLocalAiCoach, requestLocalAiPostGameSummary} from '@/online/api';

vi.mock('@/online/api', () => ({
  requestLocalAiCoach: vi.fn(),
  requestLocalAiPostGameSummary: vi.fn(),
}));

const createCoachState = (): GameState => {
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

describe('useLocalAiInsights', () => {
  beforeEach(() => {
    vi.mocked(requestLocalAiCoach).mockRejectedValue(new Error('offline'));
    vi.mocked(requestLocalAiPostGameSummary).mockRejectedValue(new Error('offline'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('returns a deterministic coach line for an enabled local human turn', async () => {
    const {result} = renderHook(() => useLocalAiInsights({
      actionLog: [],
      gameState: createCoachState(),
      isCoachEnabled: true,
    }));

    expect(result.current.aiInsightText).toBe(
      'Coach: joue le 3 de ton talon vers la pile 2 - ça réduit directement ton talon.',
    );
    await waitFor(() => expect(requestLocalAiCoach).toHaveBeenCalledTimes(1));
  });

  test('replaces the deterministic coach line with server text when available', async () => {
    vi.mocked(requestLocalAiCoach).mockResolvedValue({
      displayText: 'Coach: texte serveur amélioré.',
      fallbackUsed: false,
      localVersion: 1,
    });

    const {result} = renderHook(() => useLocalAiInsights({
      actionLog: [],
      gameState: createCoachState(),
      isCoachEnabled: true,
    }));

    expect(result.current.aiInsightText).toBe(
      'Coach: joue le 3 de ton talon vers la pile 2 - ça réduit directement ton talon.',
    );

    await waitFor(() => expect(result.current.aiInsightText).toBe('Coach: texte serveur amélioré.'));
  });

  test('hides coach text when the toggle is disabled or the AI is playing', async () => {
    const coachState = createCoachState();
    const {result, rerender} = renderHook(
      (props: {gameState: GameState; isCoachEnabled: boolean}) => useLocalAiInsights({
        actionLog: [],
        gameState: props.gameState,
        isCoachEnabled: props.isCoachEnabled,
      }),
      {
        initialProps: {
          gameState: coachState,
          isCoachEnabled: false,
        },
      },
    );

    expect(result.current.aiInsightText).toBe('');
    await Promise.resolve();
    expect(requestLocalAiCoach).not.toHaveBeenCalled();

    const aiTurnState = createCoachState();
    aiTurnState.currentPlayerIndex = 1;

    rerender({
      gameState: aiTurnState,
      isCoachEnabled: true,
    });

    expect(result.current.aiInsightText).toBe('');
    await Promise.resolve();
    expect(requestLocalAiCoach).not.toHaveBeenCalled();
  });

  test('returns a post-game summary even when the coach toggle is disabled', async () => {
    vi.mocked(requestLocalAiPostGameSummary).mockResolvedValue({
      displayText: 'Résumé: texte serveur amélioré.',
      fallbackUsed: false,
      localVersion: 1,
    });
    const gameState = createCoachState();
    const actionLog: InsightActionLogEntry[] = [
      {
        action: 'play',
        card: {value: 3, isSkipBo: false},
        playerIndex: 0,
        source: 'stock',
        sourceIndex: 0,
        stockCountAfter: 0,
        stockCountBefore: 1,
        version: 1,
      },
    ];

    gameState.gameIsOver = true;
    gameState.winnerIndex = 0;

    const {result} = renderHook(() => useLocalAiInsights({
      actionLog,
      gameState,
      isCoachEnabled: false,
    }));

    expect(result.current.aiInsightText).toBe(
      'Résumé: victoire en 1 coups - point fort: pression sur le talon; à travailler: chercher plus de coups de talon.',
    );
    await waitFor(() => expect(requestLocalAiPostGameSummary).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.aiInsightText).toBe('Résumé: texte serveur amélioré.'));
  });

  test('aborts an in-flight local coach request when the game state changes', async () => {
    vi.mocked(requestLocalAiCoach).mockImplementation(() => new Promise(() => undefined));

    const {rerender} = renderHook(
      (props: {gameState: GameState}) => useLocalAiInsights({
        actionLog: [],
        gameState: props.gameState,
        isCoachEnabled: true,
      }),
      {
        initialProps: {
          gameState: createCoachState(),
        },
      },
    );

    await waitFor(() => expect(requestLocalAiCoach).toHaveBeenCalledTimes(1));

    const firstSignal = vi.mocked(requestLocalAiCoach).mock.calls[0]?.[1]?.signal;
    expect(firstSignal?.aborted).toBe(false);

    const nextState = createCoachState();
    nextState.players[0].stockPile = [{value: 1, isSkipBo: false}];

    rerender({gameState: nextState});

    await waitFor(() => expect(firstSignal?.aborted).toBe(true));
    await waitFor(() => expect(requestLocalAiCoach).toHaveBeenCalledTimes(2));
  });
});
