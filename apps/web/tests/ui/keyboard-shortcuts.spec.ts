import { expect, test, type Page } from '@playwright/test';

import { gotoApp } from './helpers';

/**
 * The desktop keyboard layer, driven end to end against a real local game.
 *
 * Fixtures are deliberately not used: `FixtureApp` wires the board to no-op
 * callbacks and mounts no keyboard provider, so a fixture would assert nothing.
 *
 *         2   3   4   5           construction piles 1-4
 *     q   w e r t y   u i o p     talon | main 1-5 | défausses 1-4
 */

const humanArea = (page: Page) => page.getByTestId('human-player-area');

const humanHandCard = (page: Page, index: number) =>
  humanArea(page).locator(`[data-card-index="${index}"] .card`).first();

const humanDiscardPile = (page: Page, index: number) => humanArea(page).locator(`[data-pile-index="${index}"]`);

const selectedCardCount = (page: Page) => humanArea(page).locator('.card.selected').count();

/** The board settles into the human's turn after the opening deal animates in. */
const waitForHumanTurn = async (page: Page) => {
  await expect(humanArea(page)).toHaveAttribute('data-player-state', 'active');
  await page.waitForFunction(() => document.querySelectorAll('.animated-card').length === 0);
};

test.describe('@desktop keyboard shortcuts', () => {
  test('selects a hand card with its letter key and clears it with Escape', async ({ page }) => {
    await gotoApp(page);
    await waitForHumanTurn(page);

    await page.keyboard.press('w');
    await expect(humanHandCard(page, 0)).toHaveClass(/selected/);

    await page.keyboard.press('Escape');
    expect(await selectedCardCount(page)).toBe(0);
  });

  test('moves the selection between hand slots', async ({ page }) => {
    await gotoApp(page);
    await waitForHumanTurn(page);

    await page.keyboard.press('e');
    await expect(humanHandCard(page, 1)).toHaveClass(/selected/);

    await page.keyboard.press('y');
    await expect(humanHandCard(page, 4)).toHaveClass(/selected/);
    await expect(humanHandCard(page, 1)).not.toHaveClass(/selected/);

    // Pressing the selected card's own key deselects it, as clicking it does.
    await page.keyboard.press('y');
    expect(await selectedCardCount(page)).toBe(0);
  });

  test('plays onto a build pile immediately, with no confirmation', async ({ page }) => {
    await gotoApp(page);
    await waitForHumanTurn(page);

    // Skip-Bo wildcards are legal on every build pile, which makes the play
    // deterministic without depending on the shuffle.
    await page.getByTestId('debug-fill-hand-skipbo-button').click();

    await page.keyboard.press('w');
    await expect(humanHandCard(page, 0)).toHaveClass(/selected/);

    await page.keyboard.press('3');

    await expect(page.locator('[data-build-pile="1"] .card')).toBeVisible();
    expect(await selectedCardCount(page)).toBe(0);
  });

  test('arms a discard and waits for Space rather than committing', async ({ page }) => {
    await gotoApp(page);
    await waitForHumanTurn(page);

    await page.keyboard.press('w');
    await page.keyboard.press('u');

    // Armed, not discarded: the pile is highlighted and still empty.
    await expect(humanDiscardPile(page, 0)).toHaveAttribute('data-armed', 'true');
    await expect(humanDiscardPile(page, 0).locator('.card:not(.empty-card)')).toHaveCount(0);
    await expect(humanHandCard(page, 0)).toHaveClass(/selected/);
  });

  test('Escape disarms the pile but keeps the card selected', async ({ page }) => {
    await gotoApp(page);
    await waitForHumanTurn(page);

    await page.keyboard.press('w');
    await page.keyboard.press('u');
    await expect(humanDiscardPile(page, 0)).toHaveAttribute('data-armed', 'true');

    await page.keyboard.press('Escape');

    await expect(humanDiscardPile(page, 0)).not.toHaveAttribute('data-armed', 'true');
    await expect(humanHandCard(page, 0)).toHaveClass(/selected/);
  });

  test('Space commits the armed discard and ends the turn', async ({ page }) => {
    await gotoApp(page);
    await waitForHumanTurn(page);

    await page.keyboard.press('w');
    await page.keyboard.press('u');
    await page.keyboard.press('Space');

    await expect(humanDiscardPile(page, 0).locator('.card:not(.empty-card)')).toHaveCount(1);
    // Discarding ends the turn, so the board hands over to the AI.
    await expect(humanArea(page)).not.toHaveAttribute('data-player-state', 'active');
  });

  test('confirms even when a mouse click left a card holding focus', async ({ page }) => {
    await gotoApp(page);
    await waitForHumanTurn(page);

    // Clicking focuses the card (every card is tabIndex=0); the pending
    // confirmation must still reach the keyboard layer rather than re-toggling
    // the focused card.
    await humanHandCard(page, 0).click();
    await expect(humanHandCard(page, 0)).toHaveClass(/selected/);

    await page.keyboard.press('u');
    await page.keyboard.press('Space');

    await expect(humanDiscardPile(page, 0).locator('.card:not(.empty-card)')).toHaveCount(1);
  });

  test('reveals the key badges once unprompted, then puts them away', async ({ page }) => {
    await gotoApp(page);
    await waitForHumanTurn(page);

    const hintsUp = page.locator('body[data-key-hints="visible"]');

    // The one unprompted reveal, on the first turn the player can act on.
    await expect(hintsUp).toBeVisible();

    // Every bound key is labelled: talon, five hand slots, four discards,
    // four build piles.
    await expect(page.locator('.key-hint-badge')).toHaveCount(14);
    await expect(humanArea(page).locator('[data-key-hint="KeyQ"]')).toHaveText(/q/i);
    await expect(page.locator('[data-key-hint="Digit2"]')).toHaveText('2');

    // The opponent's piles are not keyboard-driven, so they carry no badges.
    await expect(page.getByTestId('ai-player-area').locator('.key-hint-badge')).toHaveCount(0);

    // It drops on its own and leaves the board as it found it.
    await expect(hintsUp).toHaveCount(0, { timeout: 10_000 });
  });

  test('brings the badges back on a key press, including an unbound one', async ({ page }) => {
    await gotoApp(page);
    await waitForHumanTurn(page);

    const hintsUp = page.locator('body[data-key-hints="visible"]');
    await expect(hintsUp).toHaveCount(0, { timeout: 10_000 });

    // `k` does nothing on the board — which is exactly the player who needs to
    // be told what the keys are.
    await page.keyboard.press('k');
    await expect(hintsUp).toBeVisible();
    await expect(hintsUp).toHaveCount(0, { timeout: 10_000 });

    // Holding Alt recalls them for as long as it is down, and acts on nothing.
    await page.keyboard.down('Alt');
    await expect(hintsUp).toBeVisible();
    expect(await selectedCardCount(page)).toBe(0);

    await page.keyboard.up('Alt');
    await expect(hintsUp).toHaveCount(0);
  });

  test('opens the cheat sheet with ?, on either turn', async ({ page }) => {
    await gotoApp(page);
    await waitForHumanTurn(page);

    await page.keyboard.press('?');

    const sheet = page.getByTestId('keyboard-shortcuts-dialog');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('heading', { name: 'Raccourcis clavier' })).toBeVisible();

    // Every binding is listed: 4 build + 1 talon + 5 hand + 4 discard, plus
    // Space, Enter, Escape and Alt.
    await expect(sheet.locator('kbd')).toHaveCount(18);

    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
  });

  test('does not let the board act while the cheat sheet is open', async ({ page }) => {
    await gotoApp(page);
    await waitForHumanTurn(page);

    await page.keyboard.press('?');
    await expect(page.getByTestId('keyboard-shortcuts-dialog')).toBeVisible();

    await page.keyboard.press('w');
    expect(await selectedCardCount(page)).toBe(0);
  });

  test('leaves the board alone while the New Game dialog is open', async ({ page }) => {
    await gotoApp(page);
    await waitForHumanTurn(page);

    await page.getByTestId('new-game-trigger').click();
    await expect(page.getByTestId('new-game-dialog')).toBeVisible();

    // Board keys typed over an open dialog must not reach the board behind it.
    await page.keyboard.press('w');
    await page.keyboard.press('e');
    expect(await selectedCardCount(page)).toBe(0);
  });

  test('lets board letters be typed into the room-code field', async ({ page }) => {
    await gotoApp(page);
    await waitForHumanTurn(page);

    await page.getByTestId('new-game-trigger').click();
    await page.getByTestId('new-game-mode-join-online').click();

    const roomCodeField = page.getByTestId('new-game-room-code-input');
    await roomCodeField.click();
    await page.keyboard.type('wue');

    // `w`, `u` and `e` are board bindings; inside a text field they are text.
    await expect(roomCodeField).toHaveValue('WUE');
    expect(await selectedCardCount(page)).toBe(0);
  });
});
