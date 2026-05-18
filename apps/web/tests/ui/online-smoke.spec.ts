import { expect, test } from '@playwright/test';

import { gotoApp } from './helpers.ts';

test.describe('Online mode smoke', () => {
  test('@desktop create-online surfaces configuration error when no apiBaseUrl', async ({ page }) => {
    await gotoApp(page, {
      runtimeConfig: { apiBaseUrl: '', appVersion: '', minimumSupportedVersion: '' },
    });

    await page.getByTestId('new-game-trigger').click();
    await page.getByTestId('new-game-mode-create-online').click();
    await page.getByTestId('new-game-create-online').click();

    await expect(page.getByTestId('new-game-error')).toBeVisible();
    await expect(page.getByTestId('new-game-error')).toContainText(/jeu en ligne|configuré/i);
  });

  test('@desktop join-online surfaces server error from the API', async ({ page }) => {
    await page.route('**/rooms/join', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Partie introuvable.' }),
      });
    });

    await gotoApp(page, {
      runtimeConfig: { apiBaseUrl: 'http://127.0.0.1:9/api', appVersion: '', minimumSupportedVersion: '' },
    });

    await page.getByTestId('new-game-trigger').click();
    await page.getByTestId('new-game-mode-join-online').click();
    await page.getByTestId('new-game-room-code-input').fill('ABC');
    await page.getByTestId('new-game-join-online').click();

    await expect(page.getByTestId('new-game-error')).toContainText('Partie introuvable.');
  });

  test('@mobile create-online surfaces configuration error when no apiBaseUrl', async ({ page }) => {
    await gotoApp(page, {
      runtimeConfig: { apiBaseUrl: '', appVersion: '', minimumSupportedVersion: '' },
    });

    await page.getByTestId('new-game-trigger').tap();
    await page.getByTestId('new-game-mode-create-online').tap();
    await page.getByTestId('new-game-create-online').tap();

    await expect(page.getByTestId('new-game-error')).toBeVisible();
  });
});
