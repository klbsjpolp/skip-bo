import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GameStatsDialog } from '@/components/GameStatsDialog';
import type { GameStatsMode, GameStatsRecord } from '@/monitoring/gameStats';

const makeRecord = (overrides: Partial<GameStatsRecord> = {}): GameStatsRecord => ({
  id: 'r1',
  schemaVersion: 1,
  appVersion: 'v1.0.0',
  mode: 'local' as GameStatsMode,
  startedAt: new Date('2026-06-25T14:03:00.000Z').toISOString(),
  endedAt: new Date('2026-06-25T14:11:30.000Z').toISOString(),
  durationMs: 510_000,
  totalTurns: 24,
  playerCount: 2,
  stockSize: 30,
  winnerIndex: 0,
  winnerName: 'Alice',
  winnerIsAI: false,
  // Names are deliberately distinct from the column headers so getByText is
  // unambiguous; the default "Joueur"/"IA" naming lives in the recorder hook.
  players: [
    {
      index: 0,
      name: 'Alice',
      isAI: false,
      startStock: 30,
      leftoverStock: 0,
      cardsCleared: 30,
      turns: 12,
      playTimeMs: 270_000,
      isWinner: true,
    },
    {
      index: 1,
      name: 'Bob',
      isAI: true,
      startStock: 30,
      leftoverStock: 7,
      cardsCleared: 23,
      turns: 12,
      playTimeMs: 240_000,
      isWinner: false,
    },
  ],
  ...overrides,
});

const openDialog = () => fireEvent.click(screen.getByTestId('game-stats-button'));

describe('GameStatsDialog', () => {
  it('summarizes a finished local game once opened', () => {
    render(<GameStatsDialog record={makeRecord()} />);
    expect(screen.queryByTestId('game-stats-dialog')).toBeNull();

    openDialog();

    expect(screen.getByTestId('game-stats-dialog')).toBeTruthy();
    // Local header omits the player count and version.
    expect(screen.getByText('Local')).toBeTruthy();
    expect(screen.queryByText(/joueurs/)).toBeNull();
    expect(screen.queryByText(/version/)).toBeNull();

    expect(screen.getByText('Début')).toBeTruthy();
    expect(screen.getByText('Durée')).toBeTruthy();
    expect(screen.getByText('8 min 30 s')).toBeTruthy();
    expect(screen.getByText('Cartes au départ')).toBeTruthy();

    // Per-player rows: names, formatted play time, and leftover stock.
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('4 min 30 s')).toBeTruthy();
    expect(screen.getByText('4 min 00 s')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('shows only the winner trophy', () => {
    render(<GameStatsDialog record={makeRecord()} />);
    openDialog();

    expect(screen.getAllByLabelText('Vainqueur')).toHaveLength(1);
  });

  it('adds the player count and version to the online header', () => {
    render(<GameStatsDialog record={makeRecord({ mode: 'online' })} />);
    openDialog();

    expect(screen.getByText(/En ligne.*2 joueurs.*version v1\.0\.0/)).toBeTruthy();
  });

  it('formats sub-minute durations in seconds only', () => {
    render(<GameStatsDialog record={makeRecord({ durationMs: 38_000 })} />);
    openDialog();

    expect(screen.getByText('38 s')).toBeTruthy();
  });

  it('falls back to the raw value for an unparseable start time', () => {
    render(<GameStatsDialog record={makeRecord({ startedAt: 'not-a-date' })} />);
    openDialog();

    expect(screen.getByText('not-a-date')).toBeTruthy();
  });
});
