import type { GameStatsRecord } from '@/monitoring/gameStats';

/**
 * Per-device, browsable history of finished games. This is the "persistent"
 * half of game stats; the "centralized global" half is the Sentry report in
 * {@link import('@/monitoring/gameAnalytics')}. Each device keeps its own log
 * of the games it played, capped to the most recent {@link MAX_RECORDS}.
 */

const STORAGE_KEY = 'skipbo_game_stats';
const SCHEMA_VERSION = 1;
const MAX_RECORDS = 100;

interface PersistedEnvelope {
  version: number;
  games: GameStatsRecord[];
}

const isGameStatsRecord = (value: unknown): value is GameStatsRecord => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.startedAt === 'string' &&
    typeof candidate.endedAt === 'string' &&
    typeof candidate.totalTurns === 'number' &&
    Array.isArray(candidate.players)
  );
};

/** Returns the saved games, newest last, or an empty array if none/corrupt. */
export const loadGameStatsHistory = (): GameStatsRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<PersistedEnvelope>;
    if (parsed.version !== SCHEMA_VERSION || !Array.isArray(parsed.games)) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    return parsed.games.filter(isGameStatsRecord);
  } catch {
    return [];
  }
};

/** Appends one finished game, trims to the cap, and persists. */
export const appendGameStatsRecord = (record: GameStatsRecord): void => {
  try {
    const games = [...loadGameStatsHistory(), record].slice(-MAX_RECORDS);
    const envelope: PersistedEnvelope = { version: SCHEMA_VERSION, games };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    /* storage unavailable, fail silently */
  }
};

export const clearGameStatsHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};
