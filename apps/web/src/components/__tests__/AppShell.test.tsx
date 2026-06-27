import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { AppShell, type AppShellProps } from '@/components/AppShell';

const renderAppShell = (overrides: Partial<AppShellProps> = {}) =>
  render(
    <AppShell
      gameBoard={<div data-testid="board" />}
      isGameOver={false}
      onJoinOnlineGame={() => Promise.resolve()}
      onReplay={() => undefined}
      onStartLocalGame={() => undefined}
      onStartOnlineGame={() => Promise.resolve()}
      {...overrides}
    />,
  );

describe('AppShell update button', () => {
  test('hides the update button when no update is pending', () => {
    renderAppShell({ isUpdatePending: false, onUpdateNow: vi.fn() });

    expect(screen.queryByTestId('app-version-update-button')).toBeNull();
  });

  test('hides the update button when no handler is provided even if an update is pending', () => {
    renderAppShell({ isUpdatePending: true });

    expect(screen.queryByTestId('app-version-update-button')).toBeNull();
  });

  test('shows the update button and invokes the handler on click', () => {
    const onUpdateNow = vi.fn();
    renderAppShell({ isUpdatePending: true, onUpdateNow });

    const button = screen.getByTestId<HTMLButtonElement>('app-version-update-button');
    expect(button.textContent).toBe('Mettre à jour');
    expect(button.disabled).toBe(false);

    fireEvent.click(button);
    expect(onUpdateNow).toHaveBeenCalledTimes(1);
  });

  test('disables the button and shows progress while the update is applying', () => {
    renderAppShell({ isUpdatePending: true, isApplyingUpdate: true, onUpdateNow: vi.fn() });

    const button = screen.getByTestId<HTMLButtonElement>('app-version-update-button');
    expect(button.textContent).toBe('Mise à jour…');
    expect(button.disabled).toBe(true);
  });
});
