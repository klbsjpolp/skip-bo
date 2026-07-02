import { describe, expect, it, vi } from 'vitest';
import { createGameStatsTracker, type GameStatsRecord, type GameStatsSnapshot } from '../gameStats';

type PlayerTuple = [name: string, isAI: boolean, leftoverStock: number];

const snap = (
  gameIsOver: boolean,
  currentPlayerIndex: number,
  winnerIndex: number | null,
  players: PlayerTuple[],
  stockSize = 10,
): GameStatsSnapshot => ({
  gameIsOver,
  currentPlayerIndex,
  winnerIndex,
  stockSize,
  players: players.map(([name, isAI, leftoverStock]) => ({ name, isAI, leftoverStock })),
});

const makeTracker = (onComplete: (record: GameStatsRecord) => void) =>
  createGameStatsTracker({
    appVersion: 'v9.9.9',
    mode: 'local',
    onComplete,
    generateId: () => 'fixed-id',
  });

describe('createGameStatsTracker', () => {
  it('records turns, per-player play time, and score for a finished game', () => {
    const onComplete = vi.fn();
    const tracker = makeTracker(onComplete);

    // P0 opens the game.
    tracker.observe(
      snap(false, 0, null, [
        ['Alice', false, 10],
        ['Bot', true, 10],
      ]),
      1000,
    );
    // Turn passes to P1 (P0 played for 3000ms).
    tracker.observe(
      snap(false, 1, null, [
        ['Alice', false, 10],
        ['Bot', true, 9],
      ]),
      4000,
    );
    // Back to P0 (P1 played for 500ms).
    tracker.observe(
      snap(false, 0, null, [
        ['Alice', false, 8],
        ['Bot', true, 7],
      ]),
      4500,
    );
    // P0 wins (final P0 segment 1500ms); winner stock is emptied.
    tracker.observe(
      snap(true, 0, 0, [
        ['Alice', false, 0],
        ['Bot', true, 7],
      ]),
      6000,
    );

    expect(onComplete).toHaveBeenCalledTimes(1);
    const record = onComplete.mock.calls[0][0] as GameStatsRecord;

    expect(record.id).toBe('fixed-id');
    expect(record.appVersion).toBe('v9.9.9');
    expect(record.mode).toBe('local');
    expect(record.totalTurns).toBe(3);
    expect(record.playerCount).toBe(2);
    expect(record.stockSize).toBe(10);
    expect(record.durationMs).toBe(5000);
    expect(record.startedAt).toBe(new Date(1000).toISOString());
    expect(record.endedAt).toBe(new Date(6000).toISOString());
    expect(record.winnerIndex).toBe(0);
    expect(record.winnerName).toBe('Alice');
    expect(record.winnerIsAI).toBe(false);

    expect(record.players[0]).toMatchObject({
      index: 0,
      name: 'Alice',
      isAI: false,
      startStock: 10,
      leftoverStock: 0,
      cardsCleared: 10,
      turns: 2,
      playTimeMs: 4500,
      isWinner: true,
    });
    expect(record.players[1]).toMatchObject({
      index: 1,
      name: 'Bot',
      isAI: true,
      startStock: 10,
      leftoverStock: 7,
      cardsCleared: 3,
      turns: 1,
      playTimeMs: 500,
      isWinner: false,
    });
  });

  it('excludes hidden time from a player play time and from the total duration', () => {
    const onComplete = vi.fn();
    const tracker = makeTracker(onComplete);

    tracker.observe(
      snap(false, 0, null, [
        ['Alice', false, 10],
        ['Bot', true, 10],
      ]),
      0,
    );
    tracker.setHidden(true, 1000); // P0 has played 1000ms so far
    tracker.setHidden(false, 5000); // 4000ms hidden, not counted
    tracker.observe(
      snap(true, 0, 0, [
        ['Alice', false, 0],
        ['Bot', true, 5],
      ]),
      6000,
    );

    const record = onComplete.mock.calls[0][0] as GameStatsRecord;
    expect(record.players[0].playTimeMs).toBe(2000); // 1000 before hide + 1000 after resume
    expect(record.durationMs).toBe(2000); // hidden span is paused in lockstep with play time
  });

  it('keeps duration paused if the game ends while still hidden', () => {
    const onComplete = vi.fn();
    const tracker = makeTracker(onComplete);

    tracker.observe(
      snap(false, 0, null, [
        ['Alice', false, 10],
        ['Bot', true, 10],
      ]),
      0,
    );
    tracker.setHidden(true, 1000); // P0 has played 1000ms so far
    // The game ends (e.g. a debug win) while the tab is still hidden.
    tracker.observe(
      snap(true, 0, 0, [
        ['Alice', false, 0],
        ['Bot', true, 5],
      ]),
      9000,
    );

    const record = onComplete.mock.calls[0][0] as GameStatsRecord;
    expect(record.players[0].playTimeMs).toBe(1000);
    expect(record.durationMs).toBe(1000); // the 8000ms hidden span never counted
  });

  it('begins a recording already paused if the tab is hidden when the game starts', () => {
    const onComplete = vi.fn();
    const tracker = makeTracker(onComplete);

    // Hidden before any game is open — setHidden must not touch a nonexistent recording.
    tracker.setHidden(true, 0);
    // The game starts while still hidden; the opening segment must not run.
    tracker.observe(
      snap(false, 0, null, [
        ['Alice', false, 10],
        ['Bot', true, 10],
      ]),
      100,
    );
    tracker.setHidden(false, 500); // resume 400ms later
    tracker.observe(
      snap(true, 0, 0, [
        ['Alice', false, 0],
        ['Bot', true, 10],
      ]),
      700,
    );

    const record = onComplete.mock.calls[0][0] as GameStatsRecord;
    expect(record.players[0].playTimeMs).toBe(200); // only the post-resume 500->700 span
    expect(record.durationMs).toBe(200); // the 100->500 hidden span never counted
  });

  it('ignores a zero-length hidden span', () => {
    const onComplete = vi.fn();
    const tracker = makeTracker(onComplete);

    tracker.observe(
      snap(false, 0, null, [
        ['Alice', false, 10],
        ['Bot', true, 10],
      ]),
      0,
    );
    tracker.setHidden(true, 500);
    tracker.setHidden(false, 500); // hidden and resumed at the exact same instant
    tracker.observe(
      snap(true, 0, 0, [
        ['Alice', false, 0],
        ['Bot', true, 5],
      ]),
      1000,
    );

    const record = onComplete.mock.calls[0][0] as GameStatsRecord;
    expect(record.players[0].playTimeMs).toBe(1000); // no time excluded
    expect(record.durationMs).toBe(1000);
  });

  it('does not increment turns when the current player is unchanged', () => {
    const onComplete = vi.fn();
    const tracker = makeTracker(onComplete);

    tracker.observe(
      snap(false, 0, null, [
        ['Alice', false, 10],
        ['Bot', true, 10],
      ]),
      0,
    );
    // Same player, mid-turn updates (card selections, plays).
    tracker.observe(
      snap(false, 0, null, [
        ['Alice', false, 9],
        ['Bot', true, 10],
      ]),
      500,
    );
    tracker.observe(
      snap(false, 0, null, [
        ['Alice', false, 8],
        ['Bot', true, 10],
      ]),
      900,
    );
    tracker.observe(
      snap(true, 0, 0, [
        ['Alice', false, 0],
        ['Bot', true, 10],
      ]),
      1000,
    );

    const record = onComplete.mock.calls[0][0] as GameStatsRecord;
    expect(record.totalTurns).toBe(1);
    expect(record.players[0].turns).toBe(1);
  });

  it('ignores a game that is already over on the first observation', () => {
    const onComplete = vi.fn();
    const tracker = makeTracker(onComplete);

    tracker.observe(
      snap(true, 0, 0, [
        ['Alice', false, 0],
        ['Bot', true, 5],
      ]),
      1000,
    );

    expect(onComplete).not.toHaveBeenCalled();
    expect(tracker.isRecording()).toBe(false);
  });

  it('reports no winner when the game ends without one', () => {
    const onComplete = vi.fn();
    const tracker = makeTracker(onComplete);

    tracker.observe(
      snap(false, 0, null, [
        ['Alice', false, 10],
        ['Bot', true, 10],
      ]),
      0,
    );
    tracker.observe(
      snap(true, 0, null, [
        ['Alice', false, 4],
        ['Bot', true, 6],
      ]),
      1000,
    );

    const record = onComplete.mock.calls[0][0] as GameStatsRecord;
    expect(record.winnerIndex).toBeNull();
    expect(record.winnerName).toBeNull();
    expect(record.winnerIsAI).toBeNull();
    expect(record.players.every((player) => !player.isWinner)).toBe(true);
  });

  it('generates an id when no generator is provided', () => {
    const onComplete = vi.fn();
    const tracker = createGameStatsTracker({ appVersion: 'v1', mode: 'local', onComplete });

    tracker.observe(
      snap(false, 0, null, [
        ['Alice', false, 10],
        ['Bot', true, 10],
      ]),
      0,
    );
    tracker.observe(
      snap(true, 0, 0, [
        ['Alice', false, 0],
        ['Bot', true, 4],
      ]),
      1000,
    );

    const record = onComplete.mock.calls[0][0] as GameStatsRecord;
    expect(typeof record.id).toBe('string');
    expect(record.id.length).toBeGreaterThan(0);
  });

  it('ignores a redundant visibility change', () => {
    const onComplete = vi.fn();
    const tracker = makeTracker(onComplete);

    tracker.observe(
      snap(false, 0, null, [
        ['Alice', false, 10],
        ['Bot', true, 10],
      ]),
      0,
    );
    tracker.setHidden(false, 500); // already visible — no-op, the segment keeps running
    tracker.observe(
      snap(true, 0, 0, [
        ['Alice', false, 0],
        ['Bot', true, 6],
      ]),
      2000,
    );

    const record = onComplete.mock.calls[0][0] as GameStatsRecord;
    expect(record.players[0].playTimeMs).toBe(2000);
  });

  it('does not count time across a turn change that happens while hidden', () => {
    const onComplete = vi.fn();
    const tracker = makeTracker(onComplete);

    tracker.observe(
      snap(false, 0, null, [
        ['Alice', false, 10],
        ['Bot', true, 10],
      ]),
      0,
    );
    tracker.setHidden(true, 1000); // P0 has played 1000ms
    tracker.observe(
      snap(false, 1, null, [
        ['Alice', false, 10],
        ['Bot', true, 9],
      ]),
      5000,
    ); // turn passes to P1 while hidden
    tracker.setHidden(false, 6000); // resume on P1's turn
    tracker.observe(
      snap(true, 1, 1, [
        ['Alice', false, 8],
        ['Bot', true, 0],
      ]),
      7000,
    );

    const record = onComplete.mock.calls[0][0] as GameStatsRecord;
    expect(record.totalTurns).toBe(2);
    expect(record.players[0].playTimeMs).toBe(1000); // only the pre-hide time
    expect(record.players[1].playTimeMs).toBe(1000); // only the post-resume time
    expect(record.durationMs).toBe(2000); // the 5000ms hidden span is excluded too
  });

  it('does not open a recording for an empty-player snapshot', () => {
    const onComplete = vi.fn();
    const tracker = makeTracker(onComplete);

    tracker.observe(snap(false, 0, null, []), 0);

    expect(tracker.isRecording()).toBe(false);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('clamps a missing or negative leftover stock to zero', () => {
    const onComplete = vi.fn();
    const tracker = makeTracker(onComplete);

    tracker.observe(
      snap(false, 0, null, [
        ['Alice', false, 10],
        ['Bot', true, 10],
      ]),
      0,
    );
    // Final snapshot drops the second player and reports a negative count.
    tracker.observe(
      {
        gameIsOver: true,
        currentPlayerIndex: 0,
        winnerIndex: 0,
        stockSize: 10,
        players: [{ name: 'Alice', isAI: false, leftoverStock: -3 }],
      },
      1000,
    );

    const record = onComplete.mock.calls[0][0] as GameStatsRecord;
    expect(record.players[0].leftoverStock).toBe(0);
    expect(record.players[0].cardsCleared).toBe(10);
    expect(record.players[1].leftoverStock).toBe(0); // missing in final snapshot → 0
    expect(record.players[1].cardsCleared).toBe(10);
  });
});
