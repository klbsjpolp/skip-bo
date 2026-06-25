import * as Sentry from '@sentry/react';
import type { GameStatsRecord } from './gameStats';

/**
 * Centralized, cross-device reporting of finished games — the "global usage
 * stats" half of the feature (the per-device browsable log lives in
 * {@link import('@/state/gameStatsHistory')}). Mirrors the theme analytics:
 *
 * - A `game.completed` {@link Sentry.captureMessage} carries low-cardinality
 *   **tags** (mode, player count, winner kind, stock size, version). Sentry
 *   groups every game into one issue whose tag distribution is the categorical
 *   breakdown ("how many games, % won by AI, 2p vs 3p, which versions").
 * - A forced `game.completed` **span** carries the numeric measurements
 *   (duration, total turns) so Sentry's Trace Explorer can `avg`/`p95`/`sum`
 *   them grouped by the same dimensions. `tracesSampleRate` is 1.0, so every
 *   game is captured.
 *
 * Player names and exact per-player numbers ride along in `extra` /
 * span attributes for per-game inspection — never as tags, which must stay
 * low-cardinality.
 */
export function reportGameCompleted(record: GameStatsRecord): void {
  const winnerKind = record.winnerIndex === null ? 'none' : record.winnerIsAI ? 'ai' : 'human';

  Sentry.captureMessage('game.completed', {
    level: 'info',
    tags: {
      'game.mode': record.mode,
      'game.player_count': String(record.playerCount),
      'game.winner_kind': winnerKind,
      'game.stock_size': String(record.stockSize),
      'game.app_version': record.appVersion,
    },
    extra: {
      durationMs: record.durationMs,
      totalTurns: record.totalTurns,
      startedAt: record.startedAt,
      winnerName: record.winnerName,
      players: record.players,
    },
  });

  // Forced span with explicit start/end so the real wall-clock duration is
  // recorded (a span left open would be truncated to the pageload transaction).
  const startMs = Date.parse(record.startedAt);
  const endMs = Date.parse(record.endedAt);
  if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) {
    const span = Sentry.startInactiveSpan({
      name: 'game.completed',
      op: 'game',
      forceTransaction: true,
      startTime: new Date(startMs),
      attributes: {
        'game.mode': record.mode,
        'game.player_count': record.playerCount,
        'game.total_turns': record.totalTurns,
        'game.duration_ms': record.durationMs,
        'game.stock_size': record.stockSize,
        'game.winner_kind': winnerKind,
      },
    });
    span.end(new Date(endMs));
  }

  if (import.meta.env.DEV) {
    console.info('[game-analytics] completed', record);
  }
}
