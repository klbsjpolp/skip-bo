import { test, expect } from '@playwright/test';

import { themes, type Theme } from '../../src/types/index.ts';
import { expectScreenshotIfBaselineExists, expectThemeClass, gotoFixture, readCardTokens } from './helpers.ts';

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
  }
});
