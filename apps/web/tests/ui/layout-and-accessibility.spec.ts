import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { themes, type Theme } from '../../src/types/index.ts';
import {
  expectScreenshotIfBaselineExists,
  expectNoHorizontalOverflow,
  expectThemeClass,
  gotoFixture,
  representativeThemes,
} from './helpers.ts';

test.describe('Layout and interaction coverage', () => {
  test('@desktop retreat-filled fixture keeps center order and retreat counter', async ({ page }) => {
    await gotoFixture(page, 'retreat-filled', 'theme-light');

    await expect(page.getByTestId('retreat-pile-title')).toHaveText('Retrait (5)');
    await expect(page.getByTestId('retreat-pile').locator('.card')).toHaveCount(3);

    const [deckBox, buildBox, retreatBox] = await Promise.all([
      page.getByTestId('center-deck-section').boundingBox(),
      page.getByTestId('center-build-section').boundingBox(),
      page.getByTestId('center-retreat-section').boundingBox(),
    ]);

    expect(deckBox).not.toBeNull();
    expect(buildBox).not.toBeNull();
    expect(retreatBox).not.toBeNull();
    expect(deckBox!.x).toBeLessThan(buildBox!.x);
    expect(buildBox!.x).toBeLessThan(retreatBox!.x);
  });

  test('@desktop theme switcher updates and persists the selected theme', async ({ page }, testInfo) => {
    await gotoFixture(page, 'ready-human', 'theme-light');
    await expect(page.getByTestId('app-version')).toHaveText(/^Version v\d+\.\d+\.\d+/);

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

  test('@desktop random theme button picks a different theme and persists it', async ({ page }) => {
    await gotoFixture(page, 'ready-human', 'theme-light');
    await expectThemeClass(page, 'theme-light');

    const availableThemes = themes.map(({ value }) => value as Theme);

    await page.getByTestId('theme-randomizer-button').click();
    await page.waitForFunction(
      ({ themeValues, previousTheme }) =>
        themeValues.some((value) => document.documentElement.classList.contains(value) && value !== previousTheme),
      { themeValues: availableThemes, previousTheme: 'theme-light' satisfies Theme },
    );

    const selectedTheme = await page.evaluate(
      (themeValues) =>
        themeValues.find((value) => document.documentElement.classList.contains(value)) ?? null,
      availableThemes,
    );

    expect(selectedTheme).not.toBeNull();
    expect(selectedTheme).not.toBe('theme-light');
    await expectThemeClass(page, selectedTheme as Theme);

    await page.reload();
    await expect(page.getByTestId('app-main')).toBeVisible();
    await expectThemeClass(page, selectedTheme as Theme);
  });

  test('@desktop theme-retro deck card back keeps its striped background', async ({ page }) => {
    await gotoFixture(page, 'ready-human', 'theme-retro');
    await expectThemeClass(page, 'theme-retro');

    const deckBack = page.getByTestId('center-deck-section').locator('.deck .back');
    await expect(deckBack).toBeVisible();

    const backgroundImage = await deckBack.evaluate((element) =>
      getComputedStyle(element).backgroundImage,
    );

    expect(backgroundImage).not.toBe('none');
    expect(backgroundImage).toContain('repeating-linear-gradient');
  });

  for (const theme of representativeThemes) {
    test(`@desktop ${theme} selected-hand state shows selection and drop affordances`, async ({ page }, testInfo) => {
      await gotoFixture(page, 'selected-hand', theme);
      await expectThemeClass(page, theme);
      await expect(page.locator('.card.selected')).toHaveCount(1);
      await expect(page.locator('.build-pile.can-drop')).toHaveCount(3);
      await expect(page.locator('.discard-pile-stack.can-drop')).toHaveCount(4);

      await expectScreenshotIfBaselineExists(page.getByTestId('game-board'), testInfo, `${theme}-selected-hand.png`, {
        animations: 'disabled',
      });
    });

    test(`@desktop ${theme} ai-turn state stays stable`, async ({ page }, testInfo) => {
      await gotoFixture(page, 'ai-turn', theme);
      await expectThemeClass(page, theme);
      await expect(page.getByTestId('ai-player-area')).toHaveAttribute('data-player-state', 'active');
      await expect(page.getByTestId('human-player-area')).toHaveAttribute('data-player-state', 'idle');

      await expectScreenshotIfBaselineExists(page.getByTestId('game-board'), testInfo, `${theme}-ai-turn.png`, {
        animations: 'disabled',
      });
    });

    test(`@desktop ${theme} victory-human state stays readable`, async ({ page }, testInfo) => {
      await gotoFixture(page, 'victory-human', theme);
      await expectThemeClass(page, theme);
      await expect(page.getByTestId('human-player-area')).toHaveAttribute('data-player-state', 'winner');
      await expect(page.getByTestId('victory-effects')).toBeVisible();

      await expectScreenshotIfBaselineExists(page.getByTestId('game-board'), testInfo, `${theme}-victory-human.png`, {
        animations: 'disabled',
      });
    });

    test(`@mobile ${theme} mobile layout avoids horizontal overflow`, async ({ page }) => {
      await gotoFixture(page, 'ready-human', theme);
      await expectThemeClass(page, theme);
      await expectNoHorizontalOverflow(page);
    });
  }

  test('@mobile retreat-filled fixture avoids horizontal overflow', async ({ page }) => {
    await gotoFixture(page, 'retreat-filled', 'theme-light');
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('Accessibility smoke', () => {
  const baseAxeBuilder = (page: Page) => new AxeBuilder({ page }).disableRules(['color-contrast']);

  const assertNoViolations = async (pageTheme: Theme, state: 'ready-human' | 'selected-hand', page: Page) => {
    await gotoFixture(page, state, pageTheme);
    const results = await baseAxeBuilder(page).analyze();
    expect(results.violations).toEqual([]);
  };

  test('@desktop ready-human fixture has no axe violations', async ({ page }) => {
    await assertNoViolations('theme-light', 'ready-human', page);
  });

  test('@desktop theme switcher open state has no axe violations', async ({ page }) => {
    await gotoFixture(page, 'ready-human', 'theme-retro-space');
    await page.getByTestId('theme-switcher-trigger').click();

    const results = await baseAxeBuilder(page)
      .include('[data-testid="theme-switcher-trigger"]')
      .include('[data-testid="theme-switcher-content"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
