import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Card, GameConfig, GameState, Player } from '@/types';
import type { GameStatsRecord, GameStatsSnapshot } from '@/monitoring/gameStats';
import { appendGameStatsRecord } from '@/state/gameStatsHistory';
import { reportGameCompleted } from '@/monitoring/gameAnalytics';
import { buildGameStatsSnapshot, useGameStatsRecorder } from '../useGameStatsRecorder';

vi.mock('@/lib/appVersion', () => ({ APP_VERSION: 'vTEST' }));
vi.mock('@/state/gameStatsHistory', () => ({ appendGameStatsRecord: vi.fn() }));
vi.mock('@/monitoring/gameAnalytics', () => ({ reportGameCompleted: vi.fn() }));

const append = vi.mocked(appendGameStatsRecord);
const report = vi.mocked(reportGameCompleted);

afterEach(() => {
  vi.clearAllMocks();
});

const stock = (length: number): Card[] => Array.from({ length }, () => ({ value: 1, isSkipBo: false }));

const makePlayer = (overrides: Partial<Player>): Player => ({
  isAI: false,
  stockPile: [],
  hand: [],
  discardPiles: [],
  ...overrides,
});

const makeGameState = (overrides: Partial<GameState>): GameState =>
  ({
    deck: [],
    buildPiles: [],
    completedBuildPiles: [],
    selectedCard: null,
    message: '',
    currentPlayerIndex: 0,
    gameIsOver: false,
    winnerIndex: null,
    config: { STOCK_SIZE: 30 } as GameConfig,
    players: [],
    ...overrides,
  }) as GameState;

describe('buildGameStatsSnapshot', () => {
  it('reads stock size, names, AI flags, and leftover stock for a local game', () => {
    const gameState = makeGameState({
      currentPlayerIndex: 1,
      winnerIndex: 0,
      gameIsOver: true,
      config: { STOCK_SIZE: 30 } as GameConfig,
      players: [makePlayer({ isAI: false, stockPile: stock(0) }), makePlayer({ isAI: true, stockPile: stock(7) })],
    });

    const snapshot = buildGameStatsSnapshot(gameState, 'local');

    expect(snapshot).toMatchObject({
      gameIsOver: true,
      currentPlayerIndex: 1,
      winnerIndex: 0,
      stockSize: 30,
    });
    expect(snapshot.players[0]).toEqual({ name: 'Joueur', isAI: false, leftoverStock: 0 });
    expect(snapshot.players[1]).toEqual({ name: 'IA', isAI: true, leftoverStock: 7 });
  });

  it('numbers multiple AI seats', () => {
    const gameState = makeGameState({
      players: [makePlayer({ isAI: false }), makePlayer({ isAI: true }), makePlayer({ isAI: true })],
    });

    const snapshot = buildGameStatsSnapshot(gameState, 'local');
    expect(snapshot.players.map((player) => player.name)).toEqual(['Joueur', 'IA 1', 'IA 2']);
  });

  it('uses displayName and forces human in online mode', () => {
    const gameState = makeGameState({
      players: [
        makePlayer({ isAI: false, name: undefined, stockPile: stock(3) } as Partial<Player>),
        // The online view marks opponents isAI:true as a rendering role only.
        { ...makePlayer({ isAI: true, stockPile: stock(5) }), displayName: 'Bob' } as Player,
      ],
    });

    const snapshot = buildGameStatsSnapshot(gameState, 'online');
    expect(snapshot.players[1]).toEqual({ name: 'Bob', isAI: false, leftoverStock: 5 });
    expect(snapshot.players.every((player) => !player.isAI)).toBe(true);
  });
});

const activeSnapshot: GameStatsSnapshot = {
  gameIsOver: false,
  currentPlayerIndex: 0,
  winnerIndex: null,
  stockSize: 10,
  players: [
    { name: 'Alice', isAI: false, leftoverStock: 10 },
    { name: 'Bot', isAI: true, leftoverStock: 10 },
  ],
};

const overSnapshot: GameStatsSnapshot = {
  ...activeSnapshot,
  gameIsOver: true,
  winnerIndex: 0,
  players: [
    { name: 'Alice', isAI: false, leftoverStock: 0 },
    { name: 'Bot', isAI: true, leftoverStock: 6 },
  ],
};

let captured: GameStatsRecord | null = null;

function Harness({ snapshot, isCentralReporter }: { snapshot: GameStatsSnapshot | null; isCentralReporter: boolean }) {
  const { lastRecord } = useGameStatsRecorder(snapshot, { mode: 'local', isCentralReporter });
  captured = lastRecord;
  return null;
}

describe('useGameStatsRecorder', () => {
  it('persists and centrally reports a finished game, exposing its record', () => {
    captured = null;
    const { rerender } = render(<Harness snapshot={activeSnapshot} isCentralReporter />);
    rerender(<Harness snapshot={overSnapshot} isCentralReporter />);

    expect(append).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledTimes(1);
    expect(captured).not.toBeNull();

    const recorded = append.mock.calls[0][0];
    expect(recorded.winnerName).toBe('Alice');
    expect(recorded.players[1].leftoverStock).toBe(6);
  });

  it('persists locally but does not centrally report when not the reporter', () => {
    captured = null;
    const { rerender } = render(<Harness snapshot={activeSnapshot} isCentralReporter={false} />);
    rerender(<Harness snapshot={overSnapshot} isCentralReporter={false} />);

    expect(append).toHaveBeenCalledTimes(1);
    expect(report).not.toHaveBeenCalled();
  });

  it('does nothing while no game is live', () => {
    captured = null;
    render(<Harness snapshot={null} isCentralReporter />);

    expect(append).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
    expect(captured).toBeNull();
  });
});
