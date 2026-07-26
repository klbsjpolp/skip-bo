import { test, expect } from '@playwright/test';

import { expectThemeClass, gotoFixture } from './helpers.ts';

/**
 * Targeted computed-style guards for the Metro discard-pile tweaks in
 * `src/themes/metro.css`. These assert the exact CSS effects directly, rather
 * than relying on the whole-board screenshot diff (whose ~1.5% tolerance is
 * large enough that an accidental revert of either rule could pass silently).
 *
 * Scoped to `@mobile` because that is where the corner-number rule matters —
 * the base `.card-corner-number` rule is `invisible lg:visible`, so on desktop
 * the front card's corner number is already shown regardless of these rules.
 */
test.describe('Metro discard piles', () => {
  test('@mobile the front numbered card shows its corner number', async ({ page }) => {
    await gotoFixture(page, 'one-of-each', 'theme-metro');
    await expectThemeClass(page, 'theme-metro');

    // Human discard pile 0 is [1, 5, 9] — three numbered cards, so the front
    // (topmost, last in DOM) card is a plain numbered card.
    const pile = page.getByTestId('human-player-area').locator('.discard-pile-stack').first();
    const frontCornerNumber = pile.locator('.card.normal-card').last().locator('.card-corner-number');

    const visibility = await frontCornerNumber.evaluate((el) => getComputedStyle(el).visibility);
    expect(visibility, 'front discard card corner number must be visible on mobile').toBe('visible');
  });

  test('@mobile a populated pile hides the build-pile "+" hint', async ({ page }) => {
    await gotoFixture(page, 'one-of-each', 'theme-metro');
    await expectThemeClass(page, 'theme-metro');

    const pile = page.getByTestId('human-player-area').locator('.discard-pile-stack').first();
    const afterContent = await pile.locator('.empty-card').evaluate((el) => getComputedStyle(el, '::after').content);

    expect(afterContent, 'the "+" hint must be suppressed behind a populated discard pile').toBe('none');
  });

  test('@mobile an empty pile still shows the "+" hint', async ({ page }) => {
    // ready-human's human discard piles are [[3,SkipBo],[8],[],[2,SkipBo,6]];
    // index 2 is empty and must keep its "+".
    await gotoFixture(page, 'ready-human', 'theme-metro');
    await expectThemeClass(page, 'theme-metro');

    const emptyPile = page.getByTestId('human-player-area').locator('.discard-pile-stack').nth(2);
    // Guard against fixture drift: this pile must actually be empty.
    await expect(emptyPile.locator('.card.normal-card, .card.skip-bo')).toHaveCount(0);

    const afterContent = await emptyPile
      .locator('.empty-card')
      .evaluate((el) => getComputedStyle(el, '::after').content);

    expect(afterContent, 'an empty discard pile must keep its "+" hint').toBe('"+"');
  });
});
