# Wool

## Document Contract

- Purpose: describe the `theme-wool` look and record improvement ideas.
- Audience: contributors maintaining the woven-texture theme.
- Source of truth: [../../apps/web/src/themes/wool.css](../../apps/web/src/themes/wool.css) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Tactile & Crafted
- **Label / icon:** "Laine" / `Spool`
- **Role:** Soft, crafted, quilted feel — the theme that looks like a hand-knit blanket on a table.

## Palette & Typography

- Cool gray palette: `#c9c9c9`, `#ddd`, `#808080` ranges with a sage-green accent `hsl(152 33% 60%)`.
- Body background `hsl(206 13% 51%)` (medium gray-blue); card front `#ddd`, card back same as body.
- Card radius `calc(var(--card-height) / 10)` — less rounded than most tactile themes.
- Card shadow uses dual inset (`inset ... rgba(0,0,0,0.2)` + `inset ... rgba(255,255,255,0.5)`) to produce the embossed / stitched-in feel.
- Typography: inherited.

## Current Features

- Body layers a fine grid (two scales: 6px and 3px) with an SVG `feTurbulence` noise filter for organic texture.
- Card backs use a 120° repeating diagonal gradient with striped yarn-weave pattern.
- Player areas apply an embossed effect: 10px outset light shadow + 10px inset dark shadow, both produced via `color-mix` on the background color.
- Empty cards use inset shadows to read as embossed cutouts.
- Skip-Bo card has a 3-color diagonal stripe (`--card-g1 / g2 / g3` at 135°); corner number hidden so the stripes read as a dedicated yarn block.
- Victory pattern is a woven-rope SVG on a slow 12s drift.

## Improvement Ideas

- **Cross-stitch on active turn.** Replace the current active-turn outline with an animated dashed border whose background-position animates, selling "running cross-stitch" on the active player's area.
- **Button-style rivets on piles.** Empty pile slots could show a small button / button-hole motif at center (two stacked radial gradients) so each slot reads as a physical attachment point.
- **Yarn trail on card play.** When a card is played, a short "yarn thread" could animate between source and destination (1px SVG path fading out). Cheap to implement and perfectly on-theme.
- **Palette variant set.** Offer two or three palette variants (warm sweater, autumn, winter) so the theme reads as a "wool wardrobe" rather than a single gray sample. Selection could cycle with the random-theme button.
- **Low-opacity stitched seam on card borders.** Add a 1px dashed inner border on card fronts mimicking a stitched seam; currently only the back communicates the woven identity.
