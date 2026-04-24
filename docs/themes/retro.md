# Retro

## Document Contract

- Purpose: describe the `theme-retro` look and record improvement ideas.
- Audience: contributors maintaining the 70s / 80s print-inspired theme.
- Source of truth: [../../apps/web/src/themes/retro.css](../../apps/web/src/themes/retro.css) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Retro & Vintage
- **Label / icon:** "Rétro" / `Radio`
- **Role:** Warm, print-era nostalgia. Earth tones, chunky offset shadows, geometric stripes — reads as a 1970s board-game box.

## Palette & Typography

- Earth palette: cream `#f4f1de`, orange `#f4a261`, coral `#e76f51`, teal `hsl(174 59% 39%)`, tan/gold `#e9c46a`.
- Primary teal, card front orange, card back tan, coral borders.
- Card radius 15px, chunky 3px solid offset shadow (`3px 3px 0 #e76f51`) — the signature "lifted sticker" feel.
- Typography: inherited.

## Current Features

- Card backs layer a complex 45° repeating stripe pattern (gradient stripes alternating with transparent bands).
- Skip-Bo card uses conic gradients on the top and bottom 1/6 of the card face, styled differently from normal cards.
- Victory uses a custom simplified SVG pattern and hides the default shine/burst animations (`display: none`), keeping the theme print-era rather than screen-era.
- Selection shadow is also chunky and offset (`3px 3px`), preserving the style under interaction.

## Improvement Ideas

- **CRT scanlines on the table.** A 1px repeating linear-gradient overlay on the body background would push the theme from "70s print" toward "70s TV" — a welcome secondary register without new assets.
- **Replace the disabled victory shine with a tape-tracking glitch.** A slow horizontal line sweeping the winner's area once, mimicking VHS tracking, fits the era better than hiding the shine entirely.
- **Period headline font.** A condensed display face (e.g. Antonio, Bebas Neue) on titles would give the theme a poster-era voice the palette is already promising.
- **Halftone Skip-Bo card.** Replace the two conic bands with a halftone dot pattern (radial-gradient repeats) for a print-comic feel that differentiates the Skip-Bo card from the normal cards more clearly.
- **Warmer empty-slot contrast.** Empty slots currently inherit the cream background; a slightly darker cream plus a dashed coral outline would read as "a dedicated spot", not a missing card.
