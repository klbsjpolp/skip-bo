import { test, expect } from '@playwright/test';

import { themes, type Theme } from '@skipbo/game-core';
import {
  expectNoHorizontalOverflow,
  expectScreenshotIfBaselineExists,
  expectThemeClass,
  gotoFixture,
  readCardTokens,
} from './helpers.ts';

test.describe('Theme contract', () => {
  for (const theme of themes.map(({ value }) => value as Theme)) {
    test(`@desktop ${theme} renders the ready-human fixture`, async ({ page }, testInfo) => {
      await gotoFixture(page, 'ready-human', theme);
      await expectThemeClass(page, theme);

      const tokenValues = await readCardTokens(page);
      for (const [tokenName, tokenValue] of Object.entries(tokenValues)) {
        expect(tokenValue, `${theme} should provide ${tokenName}`).not.toBe('');
      }

      await expectScreenshotIfBaselineExists(page.getByTestId('game-board'), testInfo, `${theme}-ready-human.png`, {
        animations: 'disabled',
      });
    });

    test(`@desktop ${theme} renders the victory-human fixture`, async ({ page }, testInfo) => {
      await gotoFixture(page, 'victory-human', theme);
      await expectThemeClass(page, theme);
      await expect(page.getByTestId('human-player-area')).toHaveAttribute('data-player-state', 'winner');
      await expect(page.getByTestId('victory-effects')).toBeVisible();

      await expectScreenshotIfBaselineExists(page.getByTestId('game-board'), testInfo, `${theme}-victory-human.png`, {
        animations: 'disabled',
      });
    });

    test(`@mobile ${theme} renders the victory-human fixture without overflow`, async ({ page }, testInfo) => {
      await gotoFixture(page, 'victory-human', theme);
      await expectThemeClass(page, theme);
      await expect(page.getByTestId('victory-effects')).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await expectScreenshotIfBaselineExists(
        page.getByTestId('game-board'),
        testInfo,
        `${theme}-victory-human-mobile.png`,
        { animations: 'disabled' },
      );
    });

    test(`@desktop ${theme} renders the new-game dialog (local + join tabs)`, async ({ page }, testInfo) => {
      await gotoFixture(page, 'ready-human', theme);
      await expectThemeClass(page, theme);

      await page.getByTestId('new-game-trigger').click();
      const dialog = page.getByTestId('new-game-dialog');
      await expect(dialog).toBeVisible();

      // Local tab is selected by default — capture it as the baseline.
      await expect(page.getByTestId('new-game-mode-local')).toHaveAttribute('aria-pressed', 'true');
      await expectScreenshotIfBaselineExists(dialog, testInfo, `${theme}-new-game-dialog-local.png`, {
        animations: 'disabled',
      });

      // Switch to "Rejoindre" (join-online) and capture the room-code form layout.
      await page.getByTestId('new-game-mode-join-online').click();
      await expect(page.getByTestId('new-game-mode-join-online')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId('new-game-room-code-input')).toBeVisible();
      await expectScreenshotIfBaselineExists(dialog, testInfo, `${theme}-new-game-dialog-join.png`, {
        animations: 'disabled',
      });
    });
  }
});
