import { existsSync, readFileSync } from 'node:fs';
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

import type { Theme } from '../../src/types/index.ts';
import type { UiFixtureName } from '../../src/testing/uiFixtures.ts';

const stableScreenshotCss = readFileSync(new URL('./stable-screenshot.css', import.meta.url), 'utf8');

const cardTokens = ['--background', '--foreground', '--selected-border-color', '--card-g1'] as const;

export const representativeThemes: Theme[] = ['theme-paper', 'theme-midnight', 'theme-glass', 'theme-retro-space'];

interface GotoAppOptions {
  theme?: Theme;
  runtimeConfig?: Record<string, unknown>;
}

export const gotoApp = async (page: Page, { theme = 'theme-paper', runtimeConfig }: GotoAppOptions = {}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript((activeTheme) => {
    window.localStorage.setItem('theme', activeTheme);
  }, theme);

  if (runtimeConfig) {
    await page.route('**/runtime-config.json', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(runtimeConfig),
      });
    });
  }

  await page.goto('/');
  await page.addStyleTag({ content: stableScreenshotCss });
  await expect(page.getByTestId('app-main')).toBeVisible();
};

export const gotoFixture = async (
  page: Page,
  fixture: UiFixtureName,
  theme: Theme,
  extraQuery: Record<string, string> = {},
) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(
    ({ activeTheme, stockSize }) => {
      if (!window.localStorage.getItem('theme')) {
        window.localStorage.setItem('theme', activeTheme);
      }

      if (!window.localStorage.getItem('skipbo_stock_size')) {
        window.localStorage.setItem('skipbo_stock_size', String(stockSize));
      }
    },
    { activeTheme: theme, stockSize: 30 },
  );

  const params = new URLSearchParams({ fixture, ...extraQuery });
  await page.goto(`/?${params.toString()}`);
  await page.addStyleTag({ content: stableScreenshotCss });
  await waitForStableUi(page, fixture);
};

export const waitForStableUi = async (page: Page, fixture: UiFixtureName) => {
  await expect(page.getByTestId('app-main')).toHaveAttribute('data-ui-fixture', fixture);
  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(page.getByTestId('game-message')).toBeVisible();
  await page.waitForFunction(() => document.querySelectorAll('.animated-card').length === 0);
  await page.evaluate(async () => {
    if ('fonts' in document) {
      await document.fonts.ready;
    }
  });
};

export const expectThemeClass = async (page: Page, theme: Theme) => {
  await expect(page.locator('html')).toHaveClass(new RegExp(`(^|\\s)${theme}(\\s|$)`));
};

export const readCardTokens = async (page: Page) =>
  page.evaluate((tokens) => {
    const styles = getComputedStyle(document.documentElement);
    return Object.fromEntries(tokens.map((token) => [token, styles.getPropertyValue(token).trim()]));
  }, cardTokens);

export const expectNoHorizontalOverflow = async (page: Page) => {
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          className: element.className,
          testId: element.dataset.testid ?? null,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        };
      })
      .filter((item) => item.right > viewportWidth + 1 || item.left < -1);

    return {
      viewportWidth,
      offenders,
    };
  });

  expect(overflow.offenders).toEqual([]);
};

export const expectScreenshotIfBaselineExists = async (
  locator: Locator,
  testInfo: TestInfo,
  name: string,
  options?: { animations?: 'disabled' | 'allow' },
) => {
  const updateMode = testInfo.config.updateSnapshots;
  const allowGenerate = updateMode === 'all' || updateMode === 'missing';

  if (!allowGenerate && !existsSync(testInfo.snapshotPath(name))) {
    testInfo.annotations.push({
      type: 'baseline-missing',
      description: `Skipped screenshot assertion for ${name} because no committed baseline is present.`,
    });
    return;
  }

  await expect(locator).toHaveScreenshot(name, options);
};
