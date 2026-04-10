import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

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
        roomStatus="ACTIVE"
      />,
    );

    expect(screen.getByTestId('online-seat-count').textContent).toContain('1/2 joueurs');
  });
});
