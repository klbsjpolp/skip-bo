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
  test('@mobile a populated pile hides the build-pile "+" hint', async ({ page }) => {
    await gotoFixture(page, 'one-of-each', 'theme-metro');
    await expectThemeClass(page, 'theme-metro');

    const pile = page.getByTestId('human-player-area').locator('.discard-pile-stack').first();
    const afterContent = await pile.locator('.empty-card').evaluate((el) => getComputedStyle(el, '::after').content);

    expect(afterContent, 'the "+" hint must be suppressed behind a populated discard pile').toBe('none');
  });

  test('@mobile every numbered card shows its corner number, Skip-Bo cards do not', async ({ page }) => {
    await gotoFixture(page, 'one-of-each', 'theme-metro');
    await expectThemeClass(page, 'theme-metro');

    // The corner tile is part of Metro's card identity everywhere, not just in
    // the discard piles — the base utility is `invisible lg:visible`, so hand /
    // stock / build-pile cards used to lose it below the `lg` breakpoint. Being
    // page-wide, this also covers the front card of a discard pile, whose
    // corner number is the only part of it the collapse leaves on screen.
    const numbered = await page
      .locator('.card.normal-card:not(.skip-bo) .card-corner-number')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).visibility));

    expect(numbered.length, 'fixture must render numbered cards').toBeGreaterThan(0);
    expect(new Set(numbered), 'every numbered card keeps its corner number on mobile').toEqual(new Set(['visible']));

    const skipBo = await page
      .locator('.card.skip-bo .card-corner-number')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).display));

    expect(skipBo.length, 'fixture must render Skip-Bo cards').toBeGreaterThan(0);
    expect(new Set(skipBo), 'Skip-Bo cards have no number to show').toEqual(new Set(['none']));
  });

  test('@desktop @mobile the collapse clips exactly to the corner badge', async ({ page }) => {
    await gotoFixture(page, 'one-of-each', 'theme-metro');
    await expectThemeClass(page, 'theme-metro');

    const pile = page.getByTestId('human-player-area').locator('.discard-pile-stack').first();

    const geometry = await pile.evaluate((stack) => {
      const cards = [...stack.querySelectorAll<HTMLElement>('.card.normal-card')];
      const collapsed = cards[0];

      // `--metro-corner-tile` is a calc() that getComputedStyle returns
      // unresolved, so measure it by rendering a probe at that width.
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;width:var(--metro-corner-tile);height:0';
      collapsed.appendChild(probe);
      const tilePx = probe.getBoundingClientRect().width;
      probe.remove();

      const cardBox = collapsed.getBoundingClientRect();
      const badge = collapsed.querySelector('.card-corner-number')!.getBoundingClientRect();
      return {
        tilePx,
        badgeRight: badge.right - cardBox.left,
        badgeBottom: badge.bottom - cardBox.top,
        collapsedClip: getComputedStyle(collapsed).clipPath,
        topClip: getComputedStyle(cards[cards.length - 1]).clipPath,
      };
    });

    // Runs at both viewports, so it also pins the `lg` step of the corner-size
    // token to the badge that reads it — 17px at 390 wide, 19px at 1440.
    expect(geometry.tilePx, 'clip target must reach the badge edge').toBeCloseTo(geometry.badgeRight, 1);
    expect(geometry.tilePx, 'badge is square').toBeCloseTo(geometry.badgeBottom, 1);

    // The top card must state inset(0) rather than leaving clip-path at `none`:
    // `none` does not interpolate, so the reveal would snap instead of wiping.
    expect(geometry.topClip, 'top card needs an interpolable clip-path').toBe('inset(0px)');
    expect(geometry.collapsedClip, 'collapsed card must be clipped to its badge').toContain('calc(100%');
  });

  test('@mobile the pile keeps its z-bumps in its own stacking context', async ({ page }) => {
    await gotoFixture(page, 'one-of-each', 'theme-metro');
    await expectThemeClass(page, 'theme-metro');

    // The pile bumps its cards to z-10/z-11 to order them within the pile. The
    // stack must isolate, otherwise those bumps leak into the player-area
    // context and tie with `.hand-area.overlap-hand` (also z-11), which made a
    // draw animation portaled into the hand fly *behind* the défausses in the
    // landscape-mobile layout where they sit between the pioche and the main.
    const isolation = await page
      .locator('.discard-pile-stack')
      .first()
      .evaluate((el) => getComputedStyle(el).isolation);

    expect(isolation, 'discard stack must not leak its z-bumps to the player area').toBe('isolate');
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
