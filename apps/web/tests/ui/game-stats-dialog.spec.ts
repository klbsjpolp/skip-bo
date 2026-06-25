import { expect, test, type Locator, type Page } from '@playwright/test';

import { expectScreenshotIfBaselineExists, gotoFixture } from './helpers.ts';

// The dialog renders the game's start time with the local locale, so pin the
// timezone to keep the baseline deterministic across machines (it is generated
// on macOS for the CI macOS runner). The record itself is a fixed fixture
// (see getStatsDialogFixtureRecord), so durations and counts are stable too.
test.use({ timezoneId: 'Europe/Paris' });

const openStatsDialog = async (page: Page, mode: 'local' | 'online'): Promise<Locator> => {
  await gotoFixture(page, 'victory-human', 'theme-paper', mode === 'online' ? { statsMode: 'online' } : {});

  // The dialog background is translucent, so the victory glow behind it (whose
  // particle positions are randomized per mount) would bleed through and make
  // the baseline flaky. Hide it so the screenshot captures only the dialog.
  await page.addStyleTag({ content: '[data-testid="victory-effects"]{display:none !important}' });

  await page.getByTestId('game-stats-button').click();
  const dialog = page.getByTestId('game-stats-dialog');
  await expect(dialog).toBeVisible();
  return dialog;
};

test.describe('Game stats dialog', () => {
  for (const mode of ['local', 'online'] as const) {
    test(`@desktop renders the ${mode} finished-game summary`, async ({ page }, testInfo) => {
      const dialog = await openStatsDialog(page, mode);
      await expectScreenshotIfBaselineExists(dialog, testInfo, `game-stats-dialog-${mode}.png`, {
        animations: 'disabled',
      });
    });

    test(`@mobile renders the ${mode} finished-game summary`, async ({ page }, testInfo) => {
      const dialog = await openStatsDialog(page, mode);
      await expectScreenshotIfBaselineExists(dialog, testInfo, `game-stats-dialog-${mode}-mobile.png`, {
        animations: 'disabled',
      });
    });
  }
});
