import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { LobbyRemovedDialog } from '@/components/LobbyDialog';

describe('LobbyRemovedDialog', () => {
  test('renders nothing open when reason is null', () => {
    render(<LobbyRemovedDialog reason={null} onDismiss={vi.fn()} />);

    expect(screen.queryByText('Partie annulée')).toBeNull();
    expect(screen.queryByText('Vous avez été exclu')).toBeNull();
  });

  test('shows host-left title and body when reason is host-left', () => {
    render(<LobbyRemovedDialog reason="host-left" onDismiss={vi.fn()} />);

    expect(screen.getByText('Partie annulée')).toBeTruthy();
    expect(screen.getByText("L'hôte a quitté la salle. La partie a été annulée.")).toBeTruthy();
  });

  test('shows kicked title and body when reason is kicked', () => {
    render(<LobbyRemovedDialog reason="kicked" onDismiss={vi.fn()} />);

    expect(screen.getByText('Vous avez été exclu')).toBeTruthy();
    expect(screen.getByText("L'hôte vous a retiré de la salle.")).toBeTruthy();
  });

  test('calls onDismiss when the button is clicked', () => {
    const onDismiss = vi.fn();

    render(<LobbyRemovedDialog reason="kicked" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: "Retour à l'accueil" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
