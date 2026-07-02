/*
  Readability contract — programmatic checks that complement the visual
  baselines. See themes/README.md §11 for the rules these tests enforce.

  Four checks per theme:
   1. Card values (`.card.normal-card .card-number`) and the prompt
      (`[data-testid="game-message"]`) meet the large-text contrast threshold
      against their effective background. `.card.empty-card` is intentionally
      exempt — it is a placeholder that should recede.
   2. `.card.selected` differs from an unselected sibling by at least one of:
      border color, box-shadow, or transform — so the selection affordance is
      always perceivable.
   3. The Skip-Bo wildcard exposes an accessible name regardless of how the
      theme renders it (wordmark, glyph, texture).
   4. UI chrome — the New Game trigger, theme switcher buttons, and every
      button inside the New Game dialog — meets the normal-text contrast
      threshold. These elements are how the user navigates the app and must
      be readable in every theme.
*/

import { expect, test, type Locator, type Page } from '@playwright/test';

import { themes, type Theme } from '@skipbo/game-core';
import { expectThemeClass, gotoFixture } from './helpers.ts';

// WCAG AA threshold for "large text" (≥18pt bold or ≥24px). Card values render
// at text-3xl (~30px) bold; the prompt is an h1. Both qualify as large text,
// so 3:1 is the spec minimum for them.
const MIN_LARGE_TEXT_CONTRAST = 3;

// WCAG AA threshold for normal text. Applies to button labels and dialog body
// copy, which render at text-sm / text-base and would not qualify as large.
const MIN_NORMAL_TEXT_CONTRAST = 4.5;

const themeValues = themes.map(({ value }) => value as Theme);

test.describe('Readability contract', () => {
  for (const theme of themeValues) {
    test(`@desktop ${theme} card values and prompt meet contrast`, async ({ page }) => {
      await gotoFixture(page, 'selected-hand', theme);
      await expectThemeClass(page, theme);

      const samples = await collectContrastSamples(page);

      // We expect at least one card value sample to exist for the fixture.
      expect(samples.cardValues.length, `${theme}: expected card value samples`).toBeGreaterThan(0);

      for (const sample of samples.cardValues) {
        expect(
          sample.contrast,
          `${theme}: card value "${sample.label}" contrast ${sample.contrast.toFixed(2)}:1 ` +
            `(fg=${sample.fg}, bg=${sample.bg}) is below ${MIN_LARGE_TEXT_CONTRAST}:1`,
        ).toBeGreaterThanOrEqual(MIN_LARGE_TEXT_CONTRAST);
      }

      expect(samples.prompt, `${theme}: expected a prompt sample`).not.toBeNull();
      expect(
        samples.prompt!.contrast,
        `${theme}: prompt "${samples.prompt!.label}" contrast ${samples.prompt!.contrast.toFixed(2)}:1 ` +
          `(fg=${samples.prompt!.fg}, bg=${samples.prompt!.bg}) is below ${MIN_LARGE_TEXT_CONTRAST}:1`,
      ).toBeGreaterThanOrEqual(MIN_LARGE_TEXT_CONTRAST);
    });

    test(`@desktop ${theme} selected card differs from unselected`, async ({ page }) => {
      await gotoFixture(page, 'selected-hand', theme);
      await expectThemeClass(page, theme);

      const delta = await readSelectionDelta(page);

      expect(
        delta.differs,
        `${theme}: .card.selected must differ from an unselected sibling in border, ` +
          `box-shadow, or transform. Got selected=${JSON.stringify(delta.selected)} ` +
          `vs unselected=${JSON.stringify(delta.unselected)}`,
      ).toBe(true);
    });

    test(`@desktop ${theme} buttons and new-game dialog meet contrast`, async ({ page }) => {
      await gotoFixture(page, 'ready-human', theme);
      await expectThemeClass(page, theme);

      // Toolbar chrome that is always visible alongside the board.
      await assertButtonContrast(page, page.getByTestId('new-game-trigger'), theme, 'new-game-trigger');
      await assertButtonContrast(page, page.getByTestId('theme-switcher-trigger'), theme, 'theme-switcher-trigger');
      await assertButtonContrast(page, page.getByTestId('theme-randomizer-button'), theme, 'theme-randomizer-button');

      // Open the New Game dialog and check every button + body text inside it.
      await page.getByTestId('new-game-trigger').click();
      const dialog = page.getByTestId('new-game-dialog');
      await expect(dialog).toBeVisible();

      const buttons = dialog.locator('button');
      const buttonCount = await buttons.count();
      expect(buttonCount, `${theme}: expected buttons inside new-game-dialog`).toBeGreaterThan(0);

      for (let i = 0; i < buttonCount; i++) {
        await assertButtonContrast(page, buttons.nth(i), theme, `new-game-dialog button #${i}`);
      }

      const bodyTextSamples = await collectDialogBodyText(page);
      for (const sample of bodyTextSamples) {
        expect(
          sample.contrast,
          `${theme}: new-game-dialog text "${sample.label}" contrast ${sample.contrast.toFixed(2)}:1 ` +
            `(fg=${sample.fg}, bg=${sample.bg}) is below ${MIN_NORMAL_TEXT_CONTRAST}:1`,
        ).toBeGreaterThanOrEqual(MIN_NORMAL_TEXT_CONTRAST);
      }
    });

    test(`@desktop ${theme} Skip-Bo card exposes an accessible name`, async ({ page }) => {
      await gotoFixture(page, 'selected-hand', theme);
      await expectThemeClass(page, theme);

      const skipBoCards = page.locator('.card.skip-bo');
      const count = await skipBoCards.count();
      expect(count, `${theme}: expected at least one Skip-Bo card in selected-hand fixture`).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const accessibleName = await skipBoCards.nth(i).evaluate((node) => {
          const ariaLabel = node.getAttribute('aria-label');
          if (ariaLabel && ariaLabel.trim().length > 0) return ariaLabel.trim();
          return (node.textContent ?? '').trim();
        });
        expect(
          /skip-?bo/i.test(accessibleName),
          `${theme}: Skip-Bo card #${i} accessible name "${accessibleName}" must mention "Skip-Bo"`,
        ).toBe(true);
      }
    });
  }
});

/* ------------------------------ helpers ------------------------------ */

interface ContrastSample {
  label: string;
  fg: string;
  bg: string;
  contrast: number;
}

interface ContrastSamples {
  cardValues: ContrastSample[];
  prompt: ContrastSample | null;
}

const collectContrastSamples = async (page: Page): Promise<ContrastSamples> =>
  page.evaluate(() => {
    const parseColor = (value: string): { r: number; g: number; b: number; a: number } | null => {
      // Computed colors come back in many forms: `rgb(r, g, b)`, `rgb(r g b / a)`,
      // `oklab(...)`, `oklch(...)`, `lab(...)`, `color(display-p3 ...)`, etc.
      // Paint onto a 1×1 canvas and read the pixel back to normalize them all
      // to straight RGBA.
      if (!value || value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      return { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
    };

    const channelLuminance = (channel: number) => {
      const v = channel / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };

    const relativeLuminance = ({ r, g, b }: { r: number; g: number; b: number }) =>
      0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);

    const contrastRatio = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => {
      const la = relativeLuminance(a);
      const lb = relativeLuminance(b);
      const lighter = Math.max(la, lb);
      const darker = Math.min(la, lb);
      return (lighter + 0.05) / (darker + 0.05);
    };

    const compositeOver = (
      top: { r: number; g: number; b: number; a: number },
      bottom: { r: number; g: number; b: number },
    ) => ({
      r: Math.round(top.r * top.a + bottom.r * (1 - top.a)),
      g: Math.round(top.g * top.a + bottom.g * (1 - top.a)),
      b: Math.round(top.b * top.a + bottom.b * (1 - top.a)),
    });

    const effectiveBackground = (start: Element): { r: number; g: number; b: number } => {
      // Collect a stack of background layers from the element up to <html>,
      // then composite them top-down so semi-transparent surfaces (e.g.
      // `bg-input/75`) blend with what's behind them — which is what the
      // user actually sees.
      const layers: { r: number; g: number; b: number; a: number }[] = [];
      let node: Element | null = start;
      while (node) {
        const bg = parseColor(getComputedStyle(node).backgroundColor);
        if (bg && bg.a > 0) {
          layers.push(bg);
          if (bg.a >= 0.999) break;
        }
        node = node.parentElement;
      }
      let result: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 };
      for (let i = layers.length - 1; i >= 0; i--) {
        result = compositeOver(layers[i], result);
      }
      return result;
    };

    const sample = (el: Element, label: string): ContrastSample | null => {
      const fgRaw = getComputedStyle(el).color;
      const fg = parseColor(fgRaw);
      if (!fg) return null;
      // Walk up from the element's parent (text sits on the card surface, not
      // on the text element itself).
      const bg = effectiveBackground(el.parentElement ?? el);
      return {
        label,
        fg: `rgb(${fg.r}, ${fg.g}, ${fg.b})`,
        bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
        contrast: contrastRatio(fg, bg),
      };
    };

    const cardValueNodes = Array.from(
      document.querySelectorAll<HTMLElement>('.card.normal-card:not(.empty-card) .card-number'),
    ).filter((node) => (node.textContent ?? '').trim().length > 0);

    const cardValues = cardValueNodes
      .map((node) => sample(node, node.textContent?.trim() ?? '?'))
      .filter((value): value is ContrastSample => value !== null);

    const promptNode = document.querySelector<HTMLElement>('[data-testid="game-message"]');
    const prompt = promptNode ? sample(promptNode, promptNode.textContent?.trim() ?? '?') : null;

    return { cardValues, prompt };
  });

interface SelectionDelta {
  differs: boolean;
  selected: { borderColor: string; boxShadow: string; transform: string } | null;
  unselected: { borderColor: string; boxShadow: string; transform: string } | null;
}

const assertButtonContrast = async (page: Page, locator: Locator, theme: Theme, label: string) => {
  await expect(locator, `${theme}: ${label} should be visible`).toBeVisible();

  const sample = await locator.evaluate((node) => {
    // Inlined because page.evaluate functions cannot close over module-scope refs.
    const parseColor = (value: string) => {
      // Computed colors may come back as `rgb(...)`, `rgba(...)`,
      // `oklab(...)`, `oklch(...)`, `lab(...)`, etc. The cheapest way to
      // normalize them to straight RGBA is to paint them onto a 1×1 canvas
      // and read the pixel back.
      if (!value || value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      return { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
    };
    const channelLuminance = (c: number) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const luminance = ({ r, g, b }: { r: number; g: number; b: number }) =>
      0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
    const ratio = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => {
      const la = luminance(a);
      const lb = luminance(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };

    const fg = parseColor(getComputedStyle(node).color);
    if (!fg) return null;

    // Collect background layers from this node up; composite top-down so
    // semi-transparent surfaces (e.g. `bg-input/75`, `bg-card/40`) blend
    // with the layers behind them. This matches what the user sees.
    const compositeOver = (
      top: { r: number; g: number; b: number; a: number },
      bottom: { r: number; g: number; b: number },
    ) => ({
      r: Math.round(top.r * top.a + bottom.r * (1 - top.a)),
      g: Math.round(top.g * top.a + bottom.g * (1 - top.a)),
      b: Math.round(top.b * top.a + bottom.b * (1 - top.a)),
    });

    const layers: { r: number; g: number; b: number; a: number }[] = [];
    let bgNode: Element | null = node;
    while (bgNode) {
      const candidate = parseColor(getComputedStyle(bgNode).backgroundColor);
      if (candidate && candidate.a > 0) {
        layers.push(candidate);
        if (candidate.a >= 0.999) break;
      }
      bgNode = bgNode.parentElement;
    }
    let bg: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 };
    for (let i = layers.length - 1; i >= 0; i--) {
      bg = compositeOver(layers[i], bg);
    }

    return {
      label: (node.textContent ?? '').trim().slice(0, 60) || node.getAttribute('aria-label') || '<icon-only>',
      fg: `rgb(${fg.r}, ${fg.g}, ${fg.b})`,
      bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
      contrast: ratio(fg, bg),
    };
  });

  expect(sample, `${theme}: ${label} should yield a contrast sample`).not.toBeNull();
  expect(
    sample!.contrast,
    `${theme}: ${label} "${sample!.label}" contrast ${sample!.contrast.toFixed(2)}:1 ` +
      `(fg=${sample!.fg}, bg=${sample!.bg}) is below ${MIN_NORMAL_TEXT_CONTRAST}:1`,
  ).toBeGreaterThanOrEqual(MIN_NORMAL_TEXT_CONTRAST);
};

const collectDialogBodyText = async (page: Page): Promise<ContrastSample[]> =>
  page.evaluate(() => {
    const parseColor = (value: string) => {
      // Computed colors may come back as `rgb(...)`, `rgba(...)`,
      // `oklab(...)`, `oklch(...)`, `lab(...)`, etc. The cheapest way to
      // normalize them to straight RGBA is to paint them onto a 1×1 canvas
      // and read the pixel back.
      if (!value || value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      return { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
    };
    const channelLuminance = (c: number) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const luminance = ({ r, g, b }: { r: number; g: number; b: number }) =>
      0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
    const ratio = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => {
      const la = luminance(a);
      const lb = luminance(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    const compositeOver = (
      top: { r: number; g: number; b: number; a: number },
      bottom: { r: number; g: number; b: number },
    ) => ({
      r: Math.round(top.r * top.a + bottom.r * (1 - top.a)),
      g: Math.round(top.g * top.a + bottom.g * (1 - top.a)),
      b: Math.round(top.b * top.a + bottom.b * (1 - top.a)),
    });
    const effectiveBackground = (start: Element) => {
      const layers: { r: number; g: number; b: number; a: number }[] = [];
      let node: Element | null = start;
      while (node) {
        const bg = parseColor(getComputedStyle(node).backgroundColor);
        if (bg && bg.a > 0) {
          layers.push(bg);
          if (bg.a >= 0.999) break;
        }
        node = node.parentElement;
      }
      let result: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 };
      for (let i = layers.length - 1; i >= 0; i--) {
        result = compositeOver(layers[i], result);
      }
      return result;
    };

    const dialog = document.querySelector('[data-testid="new-game-dialog"]');
    if (!dialog) return [];

    // Headings, paragraphs, and labels carry the body copy. Buttons are
    // handled separately; the placeholder text inside the input is decorative.
    const nodes = Array.from(dialog.querySelectorAll<HTMLElement>('h1, h2, h3, p, label, span'));
    const samples: { label: string; fg: string; bg: string; contrast: number }[] = [];
    for (const node of nodes) {
      const text = (node.textContent ?? '').trim();
      if (!text || node.closest('button')) continue;
      // Skip sr-only nodes — they're not visible.
      if (node.classList.contains('sr-only')) continue;
      const fg = parseColor(getComputedStyle(node).color);
      if (!fg) continue;
      const bg = effectiveBackground(node.parentElement ?? node);
      samples.push({
        label: text.slice(0, 60),
        fg: `rgb(${fg.r}, ${fg.g}, ${fg.b})`,
        bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
        contrast: ratio(fg, bg),
      });
    }
    return samples;
  });

const readSelectionDelta = async (page: Page): Promise<SelectionDelta> =>
  page.evaluate(() => {
    const read = (el: Element) => {
      const style = getComputedStyle(el);
      return {
        borderColor: style.borderTopColor,
        boxShadow: style.boxShadow,
        transform: style.transform,
      };
    };

    const selected = document.querySelector('.card.selected');
    // Pick an unselected hand card to compare against — same surface, same
    // size — so that any delta is the selection treatment itself.
    const unselected = document.querySelector('.card.normal-card:not(.selected):not(.empty-card)');

    if (!selected || !unselected) {
      return { differs: false, selected: null, unselected: null };
    }

    const selectedStyle = read(selected);
    const unselectedStyle = read(unselected);

    const differs =
      selectedStyle.borderColor !== unselectedStyle.borderColor ||
      selectedStyle.boxShadow !== unselectedStyle.boxShadow ||
      selectedStyle.transform !== unselectedStyle.transform;

    return { differs, selected: selectedStyle, unselected: unselectedStyle };
  });
