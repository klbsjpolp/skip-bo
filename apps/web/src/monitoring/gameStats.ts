/**
 * Game-stats recording: a small, side-effect-free tracker that watches the
 * game-state stream and produces one {@link GameStatsRecord} per finished game.
 *
 * It deliberately lives outside `game-core`: timing depends on the wall clock
 * (a side input that would make the pure reducer non-deterministic), and every
 * field it needs — turn owner, winner, per-player stock counts, the configured
 * stock size — is already present in both the local `GameState` and the online
 * redacted `ClientGameView`. So the same tracker drives local and online play
 * without touching the reducer or the relay protocol.
 *
 * The tracker takes explicit `now` timestamps so its turn-counting and
 * play-time arithmetic can be unit-tested deterministically; the React hook
 * that owns it injects `Date.now()` and tab-visibility changes.
 */

export const GAME_STATS_SCHEMA_VERSION = 1;

export type GameStatsMode = 'local' | 'online';

/** A single player's line in a finished-game record. */
export interface GameStatsPlayer {
  /** Player-array index in the recorder's perspective (seat order on the host). */
  index: number;
  name: string;
  isAI: boolean;
  /** Stock cards at the start of the game (= configured stock size). */
  startStock: number;
  /** Stock cards left at the end (the winner is always 0). */
  leftoverStock: number;
  /** Stock cards cleared during the game (`startStock - leftoverStock`). */
  cardsCleared: number;
  /** Number of turns this player took. */
  turns: number;
  /** Accumulated foreground wall-clock time spent on this player's turns. */
  playTimeMs: number;
  isWinner: boolean;
}

/** One finished game, persisted locally and reported to central analytics. */
export interface GameStatsRecord {
  id: string;
  schemaVersion: number;
  /** App version the game was played on (e.g. `v2.10.1`). */
  appVersion: string;
  mode: GameStatsMode;
  /** ISO-8601 instant the first turn began. */
  startedAt: string;
  /** ISO-8601 instant the game ended. */
  endedAt: string;
  durationMs: number;
  /** Total turns taken across all players. */
  totalTurns: number;
  playerCount: number;
  /** Configured stock size (cards each player started with). */
  stockSize: number;
  winnerIndex: number | null;
  winnerName: string | null;
  winnerIsAI: boolean | null;
  players: GameStatsPlayer[];
}

/** Per-player slice of a live snapshot fed to the tracker. */
export interface GameStatsPlayerSnapshot {
  name: string;
  isAI: boolean;
  /** Current stock-pile length. */
  leftoverStock: number;
}

/** The minimal, mode-agnostic view of the game the tracker observes each tick. */
export interface GameStatsSnapshot {
  gameIsOver: boolean;
  currentPlayerIndex: number;
  winnerIndex: number | null;
  /** Configured stock size (cards each player started with). */
  stockSize: number;
  players: GameStatsPlayerSnapshot[];
}

export interface GameStatsTrackerOptions {
  appVersion: string;
  mode: GameStatsMode;
  /** Invoked once with the finished record when a game ends. */
  onComplete: (record: GameStatsRecord) => void;
  /** Override the id generator (tests). Defaults to `crypto.randomUUID()`. */
  generateId?: () => string;
}

export interface GameStatsTracker {
  /** Feed the current game snapshot and the current wall-clock instant. */
  observe: (snapshot: GameStatsSnapshot, nowMs: number) => void;
  /** Pause/resume play-time counting (e.g. while the tab is hidden). */
  setHidden: (hidden: boolean, nowMs: number) => void;
  /** Whether a game is currently being recorded. */
  isRecording: () => boolean;
}

interface PlayerAccumulator {
  name: string;
  isAI: boolean;
  turns: number;
  playTimeMs: number;
}

interface OpenRecording {
  id: string;
  startedAtMs: number;
  stockSize: number;
  currentPlayerIndex: number;
  totalTurns: number;
  players: PlayerAccumulator[];
  /** Start of the running play-time segment, or null while paused/hidden. */
  segmentStartMs: number | null;
}

const defaultGenerateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `game-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export function createGameStatsTracker(options: GameStatsTrackerOptions): GameStatsTracker {
  const generateId = options.generateId ?? defaultGenerateId;
  let open: OpenRecording | null = null;
  let hidden = false;

  /** Credit the running segment to the active player and stop counting. */
  const closeSegment = (nowMs: number): void => {
    if (open && open.segmentStartMs !== null) {
      const elapsed = nowMs - open.segmentStartMs;
      if (elapsed > 0) {
        open.players[open.currentPlayerIndex].playTimeMs += elapsed;
      }
      open.segmentStartMs = null;
    }
  };

  /** Begin counting for the active player if we are not paused. */
  const startSegment = (nowMs: number): void => {
    if (open && !hidden && open.segmentStartMs === null) {
      open.segmentStartMs = nowMs;
    }
  };

  const beginRecording = (snapshot: GameStatsSnapshot, nowMs: number): void => {
    open = {
      id: generateId(),
      startedAtMs: nowMs,
      stockSize: snapshot.stockSize,
      currentPlayerIndex: snapshot.currentPlayerIndex,
      totalTurns: 1,
      players: snapshot.players.map((player) => ({
        name: player.name,
        isAI: player.isAI,
        turns: 0,
        playTimeMs: 0,
      })),
      segmentStartMs: null,
    };
    // The opening player's first turn is already underway.
    if (open.players[snapshot.currentPlayerIndex]) {
      open.players[snapshot.currentPlayerIndex].turns = 1;
    }
    startSegment(nowMs);
  };

  const finalize = (snapshot: GameStatsSnapshot, nowMs: number): void => {
    if (!open) return;
    closeSegment(nowMs);

    const winnerIndex = snapshot.winnerIndex;
    const players: GameStatsPlayer[] = open.players.map((accumulator, index) => {
      const leftoverStock = Math.max(0, snapshot.players[index]?.leftoverStock ?? 0);
      return {
        index,
        name: accumulator.name,
        isAI: accumulator.isAI,
        startStock: open!.stockSize,
        leftoverStock,
        cardsCleared: Math.max(0, open!.stockSize - leftoverStock),
        turns: accumulator.turns,
        playTimeMs: accumulator.playTimeMs,
        isWinner: winnerIndex === index,
      };
    });

    const winner = winnerIndex !== null ? players[winnerIndex] : null;
    const record: GameStatsRecord = {
      id: open.id,
      schemaVersion: GAME_STATS_SCHEMA_VERSION,
      appVersion: options.appVersion,
      mode: options.mode,
      startedAt: new Date(open.startedAtMs).toISOString(),
      endedAt: new Date(nowMs).toISOString(),
      durationMs: Math.max(0, nowMs - open.startedAtMs),
      totalTurns: open.totalTurns,
      playerCount: players.length,
      stockSize: open.stockSize,
      winnerIndex,
      winnerName: winner ? winner.name : null,
      winnerIsAI: winner ? winner.isAI : null,
      players,
    };

    open = null;
    options.onComplete(record);
  };

  return {
    observe(snapshot, nowMs) {
      if (!open) {
        // Only open a recording for a game still in progress; a finished
        // snapshot seen with no open recording means we missed the start
        // (e.g. a reload landed on the victory screen) — skip it.
        if (!snapshot.gameIsOver && snapshot.players.length > 0) {
          beginRecording(snapshot, nowMs);
        }
        return;
      }

      if (snapshot.gameIsOver) {
        finalize(snapshot, nowMs);
        return;
      }

      if (snapshot.currentPlayerIndex !== open.currentPlayerIndex) {
        closeSegment(nowMs);
        open.currentPlayerIndex = snapshot.currentPlayerIndex;
        open.totalTurns += 1;
        if (open.players[snapshot.currentPlayerIndex]) {
          open.players[snapshot.currentPlayerIndex].turns += 1;
        }
        startSegment(nowMs);
      }
    },

    setHidden(nextHidden, nowMs) {
      if (nextHidden === hidden) return;
      hidden = nextHidden;
      if (hidden) {
        closeSegment(nowMs);
      } else {
        startSegment(nowMs);
      }
    },

    isRecording() {
      return open !== null;
    },
  };
}
