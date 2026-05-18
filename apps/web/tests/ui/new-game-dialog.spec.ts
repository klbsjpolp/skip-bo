import { expect, test } from '@playwright/test';

import { gotoApp } from './helpers.ts';

const openDialog = async (page: import('@playwright/test').Page) => {
  await page.getByTestId('new-game-trigger').click();
  await expect(page.getByTestId('new-game-dialog')).toBeVisible();
};

test.describe('New game dialog', () => {
  test('@desktop opens, defaults to local mode, and reveals stock-size control', async ({ page }) => {
    await gotoApp(page);
    await openDialog(page);

    await expect(page.getByTestId('new-game-mode-local')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('new-game-start-local')).toBeVisible();
    await expect(page.getByLabel('Taille de pile de départ')).toBeVisible();
  });

  test('@desktop switches between local, create-online, and join-online modes', async ({ page }) => {
    await gotoApp(page);
    await openDialog(page);

    await page.getByTestId('new-game-mode-create-online').click();
    await expect(page.getByTestId('new-game-mode-create-online')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('new-game-create-online')).toBeVisible();
    await expect(page.getByLabel('Taille de pile de départ')).toBeVisible();

    await page.getByTestId('new-game-mode-join-online').click();
    await expect(page.getByTestId('new-game-mode-join-online')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('new-game-room-code-input')).toBeVisible();
    await expect(page.getByLabel('Taille de pile de départ')).toBeHidden();
  });

  test('@desktop join-online rejects an invalid room code', async ({ page }) => {
    await gotoApp(page);
    await openDialog(page);

    await page.getByTestId('new-game-mode-join-online').click();
    await page.getByTestId('new-game-room-code-input').fill('A');
    await page.getByTestId('new-game-join-online').click();

    await expect(page.getByTestId('new-game-error')).toBeVisible();
  });

  test('@desktop changing stock size updates the summary text', async ({ page }) => {
    await gotoApp(page);
    await openDialog(page);

    const trigger = page.getByLabel('Taille de pile de départ');
    await trigger.click();
    await page.getByRole('option', { name: '20' }).click();
    await expect(page.getByText('20 cartes par joueur')).toBeVisible();
  });

  test('@desktop closes on Escape', async ({ page }) => {
    await gotoApp(page);
    await openDialog(page);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('new-game-dialog')).toBeHidden();
  });

  test('@mobile opens, switches to join-online, validates an invalid code', async ({ page }) => {
    await gotoApp(page);
    await page.getByTestId('new-game-trigger').tap();
    await expect(page.getByTestId('new-game-dialog')).toBeVisible();

    await page.getByTestId('new-game-mode-join-online').tap();
    await page.getByTestId('new-game-room-code-input').fill('XX');
    await page.getByTestId('new-game-join-online').tap();

    await expect(page.getByTestId('new-game-error')).toBeVisible();
  });
});
