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
- Typography: inherited.

## Current Features

- Card back is a 135° gradient from soft cyan `#a0d2eb` to ice `#bee5eb`; 10px radius; ultra-soft shadow (0.05 opacity).
- Victory pattern renders subtle radial gradients (soft white circles) for a gentle bloom on win.
- No body-level background texture; the table relies on the pale yellow alone.

## Improvement Ideas

- **Drifting pastel clouds.** Pair the subtle victory radial gradient with a very slow, very low-opacity cloud drift on the table background, echoing [rainbow](rainbow.md) but at a much lower contrast. Reinforces "gentle daydream" aesthetic.
- **Sway on the active turn border.** A slow, low-amplitude sway animation (2-3s ease-in-out) on the active player's outline would fit the soft character without being distracting.
- **Petal burst on victory.** Replace the square burst pieces with small rounded petal shapes (oval with border-radius 50% on one axis) for a theme that matches the `Flower2` icon.
- **Dedicated display font.** A rounded humanist face (e.g. Quicksand) for titles would earn the "pastel" name; the current default font reads as a palette swap rather than a full identity.
