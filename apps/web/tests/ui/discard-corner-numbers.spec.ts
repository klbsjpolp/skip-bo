import { test, expect, type Page } from '@playwright/test';

import { expectThemeClass, gotoFixture } from './helpers.ts';

/**
 * The base `.card-corner-number` utility is `invisible lg:visible`, so these
 * assertions only mean anything below the `lg` breakpoint — hence `@mobile`.
 *
 * Themed on `theme-paper` on purpose: Metro shows the corner tile on every card
 * at every breakpoint as part of its card identity (covered by
 * `metro-discard.spec.ts`), so it cannot tell the discard-pile rule apart from
 * its own.
 */
test.describe('Discard pile corner numbers', () => {
  const pileNumbers = (page: Page, pileIndex: number) =>
    page
      .getByTestId('human-player-area')
      .locator('.discard-pile-stack')
      .nth(pileIndex)
      .locator('.card.normal-card .card-corner-number')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).visibility));

  test('@mobile a stacked pile shows the corner number on every card, top one included', async ({ page }) => {
    // ready-human's human discard piles are [[3,SkipBo],[8],[],[2,SkipBo,6]].
    await gotoFixture(page, 'ready-human', 'theme-paper');
    await expectThemeClass(page, 'theme-paper');

    // Pile 3 holds three cards, two of them numbered — the buried `2` and the
    // top `6`. Both must carry a corner number: the cards underneath are down
    // to a sliver, so the numbers are what makes the pile readable, and a top
    // card missing its own would leave that column a card short.
    const stacked = await pileNumbers(page, 3);
    expect(stacked.length, 'fixture must render two numbered cards in pile 3').toBe(2);
    expect(new Set(stacked), 'every numbered card in a stacked pile keeps its corner number').toEqual(
      new Set(['visible']),
    );

    // Pile 0 is [3, SkipBo]: the buried numbered card still counts even though
    // the card on top of it is a Skip-Bo with no number of its own.
    const underSkipBo = await pileNumbers(page, 0);
    expect(underSkipBo, 'a numbered card buried under a Skip-Bo keeps its corner number').toEqual(['visible']);
  });

  test('@mobile a single-card pile keeps its corner number hidden', async ({ page }) => {
    await gotoFixture(page, 'ready-human', 'theme-paper');
    await expectThemeClass(page, 'theme-paper');

    // Pile 1 is [8] — one card, nothing to enumerate, so it falls back to the
    // base `invisible lg:visible` and shows only the large centre number.
    const single = await pileNumbers(page, 1);
    expect(single, 'fixture must render exactly one numbered card in pile 1').toHaveLength(1);
    expect(single[0], 'a lone discard card needs no corner number on mobile').toBe('hidden');
  });

  test('@desktop every discard card shows its corner number regardless of pile depth', async ({ page }) => {
    await gotoFixture(page, 'ready-human', 'theme-paper');
    await expectThemeClass(page, 'theme-paper');

    // Above `lg` the base utility already turns the corner number on, so the
    // depth-dependent rule must not be what makes it visible there.
    const all = await page
      .getByTestId('human-player-area')
      .locator('.discard-pile-stack .card.normal-card .card-corner-number')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).visibility));

    expect(all.length, 'fixture must render numbered discard cards').toBeGreaterThan(0);
    expect(new Set(all), 'desktop shows every corner number').toEqual(new Set(['visible']));
  });
});
