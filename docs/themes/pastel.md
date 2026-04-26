# Pastel

## Document Contract

- Purpose: describe the `theme-pastel` look and record improvement ideas.
- Audience: contributors maintaining the soft-palette theme.
- Source of truth: [../../apps/web/src/themes/pastel.css](../../apps/web/src/themes/pastel.css) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Soft & Playful
- **Label / icon:** "Pastel" / `Flower2`
- **Role:** Low-contrast, gentle-on-the-eyes alternative; the calmest of the playful group.

## Palette & Typography

- Primary soft cyan `hsl(170 70% 70%)`, secondary soft yellow `#f4edaf`, success soft green `#a5dda5`.
- Surface: pale yellow background `#fbef8b`, white card fronts, very soft purple-blue borders `#d8e2ef`.
- Typography: Quicksand (rounded humanist).

## Current Features

- Card back is a 135° gradient from soft cyan `#a0d2eb` to ice `#bee5eb`; 10px radius; ultra-soft shadow (0.05 opacity).
- Victory pattern renders subtle radial gradients (soft white circles) for a gentle bloom on win.
- Petal-shaped victory burst pieces (50% 50% 10% 50% radius).
- Dedicated typography using 'Quicksand' for titles and card numbers.

## Improvement Ideas

- **Drifting pastel clouds.** Pair the subtle victory radial gradient with a very slow, very low-opacity cloud drift on the table background, echoing [rainbow](rainbow.md) but at a much lower contrast. Reinforces "gentle daydream" aesthetic.
- **Sway on the active turn border.** A slow, low-amplitude sway animation (2-3s ease-in-out) on the active player's outline would fit the soft character without being distracting.
