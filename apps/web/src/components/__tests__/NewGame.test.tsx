import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { STOCK_STORAGE_KEY } from '@/state/initialGameState.ts';
import NewGame from '../NewGame';

describe('NewGame', () => {
  test('uses the selected stock size when creating a new online game', async () => {
    const originalLocalStorage = globalThis.localStorage;
    const onStartOnlineGame = vi.fn(async () => undefined);

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => (key === STOCK_STORAGE_KEY ? '35' : null)),
      },
    });

    try {
      render(
        <NewGame
          onJoinOnlineGame={vi.fn(async () => undefined)}
          onStartLocalGame={vi.fn()}
          onStartOnlineGame={onStartOnlineGame}
        />,
      );

      expect(screen.queryByRole('combobox', { name: 'Taille de pile de départ' })).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Nouvelle partie' }));

      const dialog = await screen.findByRole('dialog', { name: 'Nouvelle partie' });
      const settingsSectionHeading = within(dialog).getByRole('heading', { name: 'Paramètres' });
      const settingsSection = settingsSectionHeading.closest('section');

      expect(settingsSection).not.toBeNull();
      expect(within(settingsSection as HTMLElement).getByRole('combobox', { name: 'Taille de pile de départ' })).toBeTruthy();
      expect(within(dialog).getByRole('heading', { name: 'Local vs IA' })).toBeTruthy();

      fireEvent.click(within(dialog).getByRole('button', { name: 'Créer' }));

      expect(within(dialog).getByRole('heading', { name: 'Créer en ligne' })).toBeTruthy();
      expect(within(dialog).getByText('Pile de départ: 35 cartes par joueur.')).toBeTruthy();

      fireEvent.click(within(dialog).getByRole('button', { name: 'Créer la partie' }));

      expect(onStartOnlineGame).toHaveBeenCalledWith(35);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    }
  });

  test('hides stock settings in join mode and normalizes the room code', async () => {
    const onJoinOnlineGame = vi.fn(async () => undefined);

    render(
      <NewGame
        onJoinOnlineGame={onJoinOnlineGame}
        onStartLocalGame={vi.fn()}
        onStartOnlineGame={vi.fn(async () => undefined)}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle partie' }));

    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle partie' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Rejoindre' }));

    expect(within(dialog).queryByRole('combobox', { name: 'Taille de pile de départ' })).toBeNull();
    expect(within(dialog).getByText('Les paramètres de partie sont définis par l’hôte.')).toBeTruthy();

    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'abcde' } });
    const joinButtons = within(dialog).getAllByRole('button', { name: 'Rejoindre' });
    fireEvent.click(joinButtons[joinButtons.length - 1]);

    expect(onJoinOnlineGame).toHaveBeenCalledWith('ABCDE');
  });
});
