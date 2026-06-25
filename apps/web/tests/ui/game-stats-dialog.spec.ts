import { expect, test } from '@playwright/test';

import { expectScreenshotIfBaselineExists, gotoFixture } from './helpers.ts';

// The dialog renders the game's start time with the local locale, so pin the
// timezone to keep the baseline deterministic across machines (it is generated
// on macOS for the CI macOS runner). The record itself is a fixed fixture
// (see getStatsDialogFixtureRecord), so durations and counts are stable too.
test.use({ timezoneId: 'Europe/Paris' });

test.describe('Game stats dialog', () => {
  test('@desktop renders the finished-game summary', async ({ page }, testInfo) => {
    await gotoFixture(page, 'victory-human', 'theme-paper');

    // The dialog background is translucent, so the victory glow behind it (whose
    // particle positions are randomized per mount) would bleed through and make
    // the baseline flaky. Hide it so the screenshot captures only the dialog.
    await page.addStyleTag({ content: '[data-testid="victory-effects"]{display:none !important}' });

    await page.getByTestId('game-stats-button').click();
    const dialog = page.getByTestId('game-stats-dialog');
    await expect(dialog).toBeVisible();

    await expectScreenshotIfBaselineExists(dialog, testInfo, 'game-stats-dialog.png', {
      animations: 'disabled',
    });
  });
});
