import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import type { Theme } from '../../src/types/index.ts';
import {
  expectScreenshotIfBaselineExists,
  expectNoHorizontalOverflow,
  expectThemeClass,
  gotoFixture,
  representativeThemes,
} from './helpers.ts';

test.describe('Layout and interaction coverage', () => {
  test('theme switcher updates and persists the selected theme', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Theme switcher visual checks are desktop-only.');

    await gotoFixture(page, 'ready-human', 'theme-light');

    await page.getByTestId('theme-switcher-trigger').click();
    await expect(page.getByTestId('theme-switcher-content')).toBeVisible();
    await expectScreenshotIfBaselineExists(page.getByTestId('theme-switcher-content'), testInfo, 'theme-switcher-open.png', {
      animations: 'disabled',
    });

    await page.getByTestId('theme-option-theme-retro-space').click();
    await expectThemeClass(page, 'theme-retro-space');

    await page.reload();
    await expect(page.getByTestId('app-main')).toBeVisible();
    await expectThemeClass(page, 'theme-retro-space');
  });

  for (const theme of representativeThemes) {
    test(`${theme} selected-hand state shows selection and drop affordances`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop', 'Selection baselines are desktop-only.');

      await gotoFixture(page, 'selected-hand', theme);
      await expectThemeClass(page, theme);
      await expect(page.locator('.card.selected')).toHaveCount(1);
      await expect(page.locator('.build-pile.can-drop')).toHaveCount(3);
      await expect(page.locator('.discard-pile-stack.can-drop')).toHaveCount(4);

      await expectScreenshotIfBaselineExists(page.getByTestId('game-board'), testInfo, `${theme}-selected-hand.png`, {
        animations: 'disabled',
      });
    });

    test(`${theme} ai-turn state stays stable`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop', 'AI baselines are desktop-only.');

      await gotoFixture(page, 'ai-turn', theme);
      await expectThemeClass(page, theme);
      await expect(page.getByTestId('ai-player-area')).toHaveAttribute('data-player-state', 'active');
      await expect(page.getByTestId('human-player-area')).toHaveAttribute('data-player-state', 'idle');

      await expectScreenshotIfBaselineExists(page.getByTestId('game-board'), testInfo, `${theme}-ai-turn.png`, {
        animations: 'disabled',
      });
    });

    test(`${theme} victory-human state stays readable`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop', 'Victory baselines are desktop-only.');

      await gotoFixture(page, 'victory-human', theme);
      await expectThemeClass(page, theme);
      await expect(page.getByTestId('human-player-area')).toHaveAttribute('data-player-state', 'winner');
      await expect(page.getByTestId('victory-effects')).toBeVisible();

      await expectScreenshotIfBaselineExists(page.getByTestId('game-board'), testInfo, `${theme}-victory-human.png`, {
        animations: 'disabled',
      });
    });

    test(`${theme} mobile layout avoids horizontal overflow`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile overflow checks only run on the mobile project.');

      await gotoFixture(page, 'ready-human', theme);
      await expectThemeClass(page, theme);
      await expectNoHorizontalOverflow(page);
    });
  }
});

test.describe('Accessibility smoke', () => {
  const baseAxeBuilder = (page: Page) => new AxeBuilder({ page }).disableRules(['color-contrast']);

  const assertNoViolations = async (pageTheme: Theme, state: 'ready-human' | 'selected-hand', page: Page) => {
    await gotoFixture(page, state, pageTheme);
    const results = await baseAxeBuilder(page).analyze();
    expect(results.violations).toEqual([]);
  };

  test('ready-human fixture has no axe violations', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Accessibility smoke is desktop-only.');
    await assertNoViolations('theme-light', 'ready-human', page);
  });

  test('theme switcher open state has no axe violations', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Accessibility smoke is desktop-only.');

    await gotoFixture(page, 'ready-human', 'theme-retro-space');
    await page.getByTestId('theme-switcher-trigger').click();

    const results = await baseAxeBuilder(page)
      .include('[data-testid="theme-switcher-trigger"]')
      .include('[data-testid="theme-switcher-content"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
