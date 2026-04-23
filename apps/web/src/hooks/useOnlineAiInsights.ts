import {useEffect, useState} from 'react';

import type {RoomSession, RoomStatus} from '@skipbo/multiplayer-protocol';

import {requestAiCoach, requestAiPostGameSummary} from '@/online/api';

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

interface UseOnlineAiInsightsOptions {
  gameIsOver: boolean;
  isCoachEnabled: boolean;
  isLocalTurn: boolean;
  roomStatus: RoomStatus;
  roomVersion: number;
  session: Pick<RoomSession, 'roomCode' | 'seatIndex' | 'seatToken'>;
}

interface OnlineAiInsightsState {
  aiInsightText: string;
}

export function useOnlineAiInsights({
  gameIsOver,
  isCoachEnabled,
  isLocalTurn,
  roomStatus,
  roomVersion,
  session,
}: UseOnlineAiInsightsOptions): OnlineAiInsightsState {
  const [aiInsightText, setAiInsightText] = useState('');
  const canAutoRequestCoach = isCoachEnabled && roomStatus === 'ACTIVE' && isLocalTurn && !gameIsOver;
  const coachRequestKey = `${session.roomCode}:${session.seatIndex}:${roomVersion}:coach`;
  const summaryRequestKey = `${session.roomCode}:${session.seatIndex}:${roomVersion}:summary`;
  const displayedAiInsightText = canAutoRequestCoach || gameIsOver ? aiInsightText : '';

  useEffect(() => {
    if (!canAutoRequestCoach) {
      return;
    }

    const controller = new AbortController();
    let isCurrentRequest = true;

    void Promise.resolve()
      .then(() => {
        if (!isCurrentRequest) {
          return undefined;
        }

        setAiInsightText('Coach: analyse en cours...');
        return requestAiCoach(session, roomVersion || undefined, {signal: controller.signal});
      })
      .then((insight) => {
        if (!isCurrentRequest || !insight) {
          return;
        }

        setAiInsightText(insight.displayText);
      })
      .catch((error: unknown) => {
        if (!isCurrentRequest || isAbortError(error)) {
          return;
        }

        console.error('Failed to load coach insight', error);
        setAiInsightText(error instanceof Error ? error.message : 'Coach indisponible.');
      });

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [
    canAutoRequestCoach,
    coachRequestKey,
    roomVersion,
    session,
  ]);

  useEffect(() => {
    if (!gameIsOver) {
      return;
    }

    const controller = new AbortController();
    let isCurrentRequest = true;

    void Promise.resolve()
      .then(() => {
        if (!isCurrentRequest) {
          return undefined;
        }

        setAiInsightText('Résumé: génération en cours...');
        return requestAiPostGameSummary(session, {signal: controller.signal});
      })
      .then((insight) => {
        if (!isCurrentRequest || !insight) {
          return;
        }

        setAiInsightText(insight.displayText);
      })
      .catch((error: unknown) => {
        if (!isCurrentRequest || isAbortError(error)) {
          return;
        }

        console.error('Failed to load post-game summary insight', error);
        setAiInsightText('Résumé indisponible.');
      });

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [
    gameIsOver,
    session,
    summaryRequestKey,
  ]);

  return {
    aiInsightText: displayedAiInsightText,
  };
}
