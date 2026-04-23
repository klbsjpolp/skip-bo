import {renderHook, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, test, vi} from 'vitest';

import type {AiCoachResponse, AiPostGameSummaryResponse, RoomSession, RoomStatus} from '@skipbo/multiplayer-protocol';

import {requestAiCoach, requestAiPostGameSummary} from '@/online/api';
import {useOnlineAiInsights} from '@/hooks/useOnlineAiInsights';

vi.mock('@/online/api', () => ({
  requestAiCoach: vi.fn(),
  requestAiPostGameSummary: vi.fn(),
}));

const session: Pick<RoomSession, 'roomCode' | 'seatIndex' | 'seatToken'> = {
  roomCode: 'ABCDE',
  seatIndex: 0,
  seatToken: 'seat-token',
};

interface HookProps {
  gameIsOver: boolean;
  isCoachEnabled: boolean;
  isLocalTurn: boolean;
  roomStatus: RoomStatus;
  roomVersion: number;
}

const defaultProps: HookProps = {
  gameIsOver: false,
  isCoachEnabled: true,
  isLocalTurn: true,
  roomStatus: 'ACTIVE',
  roomVersion: 1,
};

const renderInsightsHook = (props: HookProps) =>
  renderHook((hookProps: HookProps) => useOnlineAiInsights({
    ...hookProps,
    session,
  }), {
    initialProps: props,
  });

describe('useOnlineAiInsights', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('cancels an in-flight coach request when the room version changes', async () => {
    vi.mocked(requestAiCoach).mockImplementation(() => new Promise<AiCoachResponse>(() => undefined));

    const {rerender} = renderInsightsHook(defaultProps);

    await waitFor(() => expect(requestAiCoach).toHaveBeenCalledTimes(1));

    const firstSignal = vi.mocked(requestAiCoach).mock.calls[0]?.[2]?.signal;

    expect(firstSignal?.aborted).toBe(false);

    rerender({
      ...defaultProps,
      roomVersion: 2,
    });

    await waitFor(() => expect(firstSignal?.aborted).toBe(true));
    await waitFor(() => expect(requestAiCoach).toHaveBeenCalledTimes(2));
    expect(vi.mocked(requestAiCoach).mock.calls[1]?.[1]).toBe(2);
  });

  test('does not request coach insights when the toggle is off', async () => {
    renderInsightsHook({
      ...defaultProps,
      isCoachEnabled: false,
    });

    await Promise.resolve();

    expect(requestAiCoach).not.toHaveBeenCalled();
  });

  test('requests the post-game summary automatically even when coach is disabled', async () => {
    vi.mocked(requestAiPostGameSummary).mockResolvedValue({
      displayText: 'Résumé: victoire en 12 coups - point fort: talon.',
      fallbackUsed: true,
      roomVersion: 7,
    } satisfies AiPostGameSummaryResponse);

    const {result} = renderInsightsHook({
      gameIsOver: true,
      isCoachEnabled: false,
      isLocalTurn: false,
      roomStatus: 'FINISHED',
      roomVersion: 7,
    });

    await waitFor(() => expect(requestAiPostGameSummary).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.aiInsightText).toBe('Résumé: victoire en 12 coups - point fort: talon.'));
  });
});
