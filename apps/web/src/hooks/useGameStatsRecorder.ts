import { useEffect, useRef, useState } from 'react';

import type { GameState, Player } from '@skipbo/game-core';
import { APP_VERSION } from '@/lib/appVersion';
import { reportGameCompleted } from '@/monitoring/gameAnalytics';
import {
  createGameStatsTracker,
  type GameStatsMode,
  type GameStatsRecord,
  type GameStatsSnapshot,
  type GameStatsTracker,
} from '@/monitoring/gameStats';
import { appendGameStatsRecord } from '@/state/gameStatsHistory';

interface UseGameStatsRecorderOptions {
  mode: GameStatsMode;
  /**
   * Whether this client owns the centralized (Sentry) report. Local games:
   * always true. Online games: only the host, so a finished game is reported
   * once rather than once per connected seat.
   */
  isCentralReporter: boolean;
}

/**
 * Resolves a player's display name across modes. The online view carries an
 * already-resolved `displayName`; local games have no names, so humans become
 * "Joueur" and AI seats "IA" (numbered when there is more than one).
 */
const resolvePlayerName = (player: Player, index: number, aiCount: number): string => {
  const displayName = (player as Player & { displayName?: string }).displayName?.trim();
  if (displayName) return displayName;
  if (player.name?.trim()) return player.name.trim();
  if (player.isAI) return aiCount > 1 ? `IA ${index}` : 'IA';
  return 'Joueur';
};

/**
 * Whether an online game should be recorded this tick. The game must be in a
 * playable/finished room state *and* a real server view must have been ingested
 * — until then `gameState` is the seat-capacity placeholder (wrong player count,
 * generic "IA" names), which the tracker would otherwise freeze for the whole
 * game since it snapshots names when it opens the recording.
 */
export const shouldRecordOnlineStats = (roomStatus: string, hasGameView: boolean): boolean =>
  (roomStatus === 'ACTIVE' || roomStatus === 'FINISHED') && hasGameView;

/**
 * Projects a `GameState` (local) or cloned `ClientGameView` (online) onto the
 * minimal snapshot the tracker consumes. Online games are always human-vs-human
 * — the view marks opponents `isAI: true` only as a rendering role — so `isAI`
 * is forced false there.
 */
export const buildGameStatsSnapshot = (gameState: GameState, mode: GameStatsMode): GameStatsSnapshot => {
  const aiCount = gameState.players.filter((player) => player.isAI).length;
  return {
    gameIsOver: gameState.gameIsOver,
    currentPlayerIndex: gameState.currentPlayerIndex,
    winnerIndex: gameState.winnerIndex,
    stockSize: gameState.config.STOCK_SIZE,
    players: gameState.players.map((player, index) => ({
      name: resolvePlayerName(player, index, aiCount),
      isAI: mode === 'online' ? false : player.isAI,
      leftoverStock: player.stockPile.length,
    })),
  };
};

/**
 * Records one stats entry per finished game by observing the game-state stream.
 * Pass `snapshot = null` while no game is live (e.g. the online lobby) so the
 * tracker does not open a recording. Persists every finished game locally and,
 * for the central reporter, reports it to Sentry. Returns the most recently
 * finished game's record for the victory-screen summary.
 */
export function useGameStatsRecorder(
  snapshot: GameStatsSnapshot | null,
  { mode, isCentralReporter }: UseGameStatsRecorderOptions,
): { lastRecord: GameStatsRecord | null } {
  const [lastRecord, setLastRecord] = useState<GameStatsRecord | null>(null);

  // Read the latest reporter flag from a ref inside the finished-game effect so
  // toggling it never re-runs the persist/report side effect for a past game.
  const isCentralReporterRef = useRef(isCentralReporter);
  useEffect(() => {
    isCentralReporterRef.current = isCentralReporter;
  }, [isCentralReporter]);

  // One tracker per screen instance, created lazily so `mode` is captured once.
  // A remount (e.g. a replayed game) gets a fresh tracker and a cleared record.
  // The callback only stores the record; persisting and reporting happen in the
  // effect below, after commit.
  const [tracker] = useState<GameStatsTracker>(() =>
    createGameStatsTracker({ appVersion: APP_VERSION, mode, onComplete: setLastRecord }),
  );

  useEffect(() => {
    if (!snapshot) return;
    tracker.observe(snapshot, Date.now());
  }, [snapshot, tracker]);

  // Persist every finished game locally; the central reporter also reports it.
  useEffect(() => {
    if (!lastRecord) return;
    appendGameStatsRecord(lastRecord);
    if (isCentralReporterRef.current) {
      reportGameCompleted(lastRecord);
    }
  }, [lastRecord]);

  // Pause play-time (and duration) counting while the tab is hidden, like the
  // theme timer, so background time is not attributed to whoever's turn it
  // is. Local only: in a local game a hidden tab means nobody can act, so the
  // whole game is genuinely paused. Online, this client's own tab visibility
  // says nothing about whether the game is paused — other seats keep playing
  // regardless — so online games never pause.
  useEffect(() => {
    if (mode !== 'local') return;

    const onVisibilityChange = () => tracker.setHidden(document.visibilityState === 'hidden', Date.now());
    const onPageHide = () => tracker.setHidden(true, Date.now());

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [mode, tracker]);

  return { lastRecord };
}
