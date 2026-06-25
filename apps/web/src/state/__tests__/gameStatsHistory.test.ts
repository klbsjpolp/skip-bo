import { beforeEach, describe, expect, it } from 'vitest';
import { appendGameStatsRecord, clearGameStatsHistory, loadGameStatsHistory } from '../gameStatsHistory';
import type { GameStatsRecord } from '@/monitoring/gameStats';

const STORAGE_KEY = 'skipbo_game_stats';

const record = (id: string): GameStatsRecord => ({
  id,
  schemaVersion: 1,
  appVersion: 'v1.0.0',
  mode: 'local',
  startedAt: new Date(0).toISOString(),
  endedAt: new Date(1000).toISOString(),
  durationMs: 1000,
  totalTurns: 4,
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
      turns: 2,
      playTimeMs: 500,
      isWinner: true,
    },
    {
      index: 1,
      name: 'Bot',
      isAI: true,
      startStock: 10,
      leftoverStock: 5,
      cardsCleared: 5,
      turns: 2,
      playTimeMs: 500,
      isWinner: false,
    },
  ],
});

beforeEach(() => {
  localStorage.clear();
});

describe('gameStatsHistory', () => {
  it('round-trips appended records newest last', () => {
    appendGameStatsRecord(record('a'));
    appendGameStatsRecord(record('b'));

    const games = loadGameStatsHistory();
    expect(games.map((game) => game.id)).toEqual(['a', 'b']);
  });

  it('caps the history at 100 records, keeping the most recent', () => {
    for (let i = 0; i < 105; i += 1) {
      appendGameStatsRecord(record(`g${i}`));
    }

    const games = loadGameStatsHistory();
    expect(games).toHaveLength(100);
    expect(games[0].id).toBe('g5');
    expect(games[99].id).toBe('g104');
  });

  it('returns an empty array and clears the key on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(loadGameStatsHistory()).toEqual([]);
  });

  it('discards an envelope with an unexpected schema version', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, games: [record('a')] }));
    expect(loadGameStatsHistory()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clears the stored history', () => {
    appendGameStatsRecord(record('a'));
    clearGameStatsHistory();
    expect(loadGameStatsHistory()).toEqual([]);
  });
});
