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
- Player and center sections now carry a subtle CRT-style scanline overlay, giving the play zones a 70s TV-screen texture without applying it to the whole page.
- Retro headings now switch to a condensed display stack, giving titles a poster-era voice while leaving body copy on the shared app font.
- Skip-Bo cards keep the original retro conic-band treatment on the top and bottom edges of the face.
- Empty slots now render with a darker cream fill and dashed coral outline so dedicated drop targets are visible at a glance.
- Victory keeps the custom simplified SVG pattern and hides the generic shine/burst animations so the winner state stays print-era.
- Selection shadow is also chunky and offset (`3px 3px`), preserving the style under interaction.

## Improvement Notes

- The previously listed ideas have been adopted into `retro.css`.
- Future changes should preserve the print-era palette and chunky offset shadows even when adding motion or overlays.
