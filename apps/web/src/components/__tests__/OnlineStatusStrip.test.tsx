import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { OnlineStatusStrip } from '@/components/OnlineStatusStrip';

describe('OnlineStatusStrip', () => {
  test('shows the connected player count against the provided seat capacity', () => {
    render(
      <OnlineStatusStrip
        connectedSeats={[0, 1]}
        connectionStatus="connected"
        roomCode="ABCDE"
        roomStatus="WAITING"
        seatCapacity={4}
      />,
    );

    expect(screen.getByTestId('online-seat-count').textContent).toContain('2/4 joueurs');
    expect(screen.getByText('ABCDE')).toBeTruthy();
  });

  test('defaults to the current two-seat room capacity', () => {
    render(
      <OnlineStatusStrip
        connectedSeats={[0]}
        connectionStatus="connected"
        roomCode="ABCDE"
        roomStatus="WAITING"
      />,
    );

    expect(screen.getByTestId('online-seat-count').textContent).toContain('1/2 joueurs');
  });

  test('shows an active-room status instead of a waiting-room status after the game starts', () => {
    render(
      <OnlineStatusStrip
        connectedSeats={[0, 1]}
        connectionStatus="connected"
        roomCode="ABCDE"
        roomStatus="ACTIVE"
        seatCapacity={4}
      />,
    );

    expect(screen.getByLabelText('Partie en cours')).toBeTruthy();
    expect(screen.queryByTestId('online-seat-count')).toBeNull();
  });

  test('shows a host start button that can be enabled once enough players are connected', () => {
    const onStartGame = vi.fn();

    render(
      <OnlineStatusStrip
        canStartGame={true}
        connectedSeats={[0, 1]}
        connectionStatus="connected"
        isHost={true}
        onStartGame={onStartGame}
        roomCode="ABCDE"
        roomStatus="WAITING"
        seatCapacity={4}
      />,
    );

    expect(
      screen.getByTestId('online-room-controls').contains(screen.getByRole('button', { name: 'Démarrer' })),
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer' }));
    expect(onStartGame).toHaveBeenCalledTimes(1);
  });
});
