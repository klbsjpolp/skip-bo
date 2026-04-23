import {useEffect, useMemo, useState} from 'react';

import {
  createCoachInsightText,
  createPostGameSummaryInsightText,
  getBestAdviceRecommendation,
  type AdviceRecommendation,
  type GameState,
  type InsightActionLogEntry,
} from '@/types';
import {requestLocalAiCoach, requestLocalAiPostGameSummary} from '@/online/api';

interface UseLocalAiInsightsOptions {
  actionLog: InsightActionLogEntry[];
  gameState: GameState;
  isCoachEnabled: boolean;
  playerIndex?: number;
}

interface LocalAiInsightsState {
  aiInsightText: string;
}

type LocalInsightRequest =
  | {
      fallbackText: string;
      kind: 'coach';
      localVersion: number;
      recommendation: AdviceRecommendation;
      requestKey: string;
    }
  | {
      actionLog: InsightActionLogEntry[];
      fallbackText: string;
      kind: 'summary';
      localVersion: number;
      playerIndex: number;
      requestKey: string;
      winnerIndex: number | null;
    }

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

export function useLocalAiInsights({
  actionLog,
  gameState,
  isCoachEnabled,
  playerIndex = 0,
}: UseLocalAiInsightsOptions): LocalAiInsightsState {
  const localInsightRequest = useMemo<LocalInsightRequest | null>(() => {
    if (gameState.gameIsOver) {
      const fallbackText = createPostGameSummaryInsightText({
        actionLog,
        playerIndex,
        winnerIndex: gameState.winnerIndex,
      });
      const localVersion = Math.max(1, actionLog.length);

      return {
        actionLog,
        fallbackText,
        kind: 'summary',
        localVersion,
        playerIndex,
        requestKey: JSON.stringify({
          actionLog,
          kind: 'summary',
          localVersion,
          playerIndex,
          winnerIndex: gameState.winnerIndex,
        }),
        winnerIndex: gameState.winnerIndex,
      };
    }

    const isLocalPlayerTurn =
      gameState.currentPlayerIndex === playerIndex &&
      !gameState.players[playerIndex]?.isAI;

    if (!isCoachEnabled || !isLocalPlayerTurn) {
      return null;
    }

    const recommendation = getBestAdviceRecommendation(gameState, playerIndex);
    const fallbackText = createCoachInsightText(recommendation);
    const localVersion = actionLog.length + 1;

    return {
      fallbackText,
      kind: 'coach',
      localVersion,
      recommendation,
      requestKey: JSON.stringify({
        kind: 'coach',
        localVersion,
        recommendation,
      }),
    };
  }, [
    actionLog,
    gameState,
    isCoachEnabled,
    playerIndex,
  ]);
  const [serverInsight, setServerInsight] = useState<{requestKey: string; text: string} | null>(null);
  const fallbackText = localInsightRequest?.fallbackText ?? '';
  const aiInsightText =
    serverInsight && localInsightRequest && serverInsight.requestKey === localInsightRequest.requestKey
      ? serverInsight.text
      : fallbackText;

  useEffect(() => {
    if (!localInsightRequest) {
      return;
    }

    const controller = new AbortController();
    let isCurrentRequest = true;

    const requestKey = localInsightRequest.requestKey;

    void Promise.resolve()
      .then(() => {
        if (localInsightRequest.kind === 'coach') {
          return requestLocalAiCoach({
            localVersion: localInsightRequest.localVersion,
            recommendation: localInsightRequest.recommendation,
          }, {signal: controller.signal});
        }

        return requestLocalAiPostGameSummary({
          actionLog: localInsightRequest.actionLog,
          localVersion: localInsightRequest.localVersion,
          playerIndex: localInsightRequest.playerIndex,
          winnerIndex: localInsightRequest.winnerIndex,
        }, {signal: controller.signal});
      })
      .then((insight) => {
        if (!isCurrentRequest) {
          return;
        }

        if (
          insight.localVersion !== undefined &&
          insight.localVersion !== localInsightRequest.localVersion
        ) {
          return;
        }

        setServerInsight({
          requestKey,
          text: insight.displayText,
        });
      })
      .catch((error: unknown) => {
        if (!isCurrentRequest || isAbortError(error)) {
          return;
        }
      });

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [localInsightRequest]);

  return {aiInsightText};
}
