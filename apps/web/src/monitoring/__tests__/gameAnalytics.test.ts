import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/react';
import { reportGameCompleted } from '../gameAnalytics';
import type { GameStatsRecord } from '../gameStats';

const endSpan = vi.fn();

vi.mock('@sentry/react', () => ({
  captureMessage: vi.fn(),
  startInactiveSpan: vi.fn(() => ({ end: endSpan })),
}));

const captureMessage = vi.mocked(Sentry.captureMessage);
const startInactiveSpan = vi.mocked(Sentry.startInactiveSpan);

const baseRecord = (overrides: Partial<GameStatsRecord> = {}): GameStatsRecord => ({
  id: 'id-1',
  schemaVersion: 1,
  appVersion: 'v2.10.1',
  mode: 'local',
  startedAt: new Date(1000).toISOString(),
  endedAt: new Date(61000).toISOString(),
  durationMs: 60000,
  totalTurns: 12,
  playerCount: 2,
  stockSize: 10,
  winnerIndex: 0,
  winnerName: 'Alice',
  winnerIsAI: false,
  players: [
    {
      index: 0,
      name: 'Alice',
      isAI: false,
      startStock: 10,
      leftoverStock: 0,
      cardsCleared: 10,
      turns: 6,
      playTimeMs: 30000,
      isWinner: true,
    },
    {
      index: 1,
      name: 'Bot',
      isAI: true,
      startStock: 10,
      leftoverStock: 4,
      cardsCleared: 6,
      turns: 6,
      playTimeMs: 30000,
      isWinner: false,
    },
  ],
  ...overrides,
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('reportGameCompleted', () => {
  it('emits a tagged game.completed message', () => {
    reportGameCompleted(baseRecord());

    expect(captureMessage).toHaveBeenCalledWith(
      'game.completed',
      expect.objectContaining({
        level: 'info',
        tags: {
          'game.mode': 'local',
          'game.player_count': '2',
          'game.winner_kind': 'human',
          'game.stock_size': '10',
          'game.app_version': 'v2.10.1',
        },
      }),
    );
  });

  it('emits a forced span with numeric measurements and ends it', () => {
    reportGameCompleted(baseRecord());

    expect(startInactiveSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'game.completed',
        op: 'game',
        forceTransaction: true,
        startTime: new Date(1000),
        attributes: expect.objectContaining({
          'game.total_turns': 12,
          'game.duration_ms': 60000,
          'game.player_count': 2,
          'game.winner_kind': 'human',
        }),
      }),
    );
    expect(endSpan).toHaveBeenCalledWith(new Date(61000));
  });

  it('tags the winner kind as ai and none', () => {
    reportGameCompleted(baseRecord({ winnerIsAI: true }));
    expect(captureMessage).toHaveBeenLastCalledWith(
      'game.completed',
      expect.objectContaining({ tags: expect.objectContaining({ 'game.winner_kind': 'ai' }) }),
    );

    reportGameCompleted(baseRecord({ winnerIndex: null, winnerName: null, winnerIsAI: null }));
    expect(captureMessage).toHaveBeenLastCalledWith(
      'game.completed',
      expect.objectContaining({ tags: expect.objectContaining({ 'game.winner_kind': 'none' }) }),
    );
  });
});
