# Metro

## Document Contract

- Purpose: describe the `theme-metro` look and record improvement ideas.
- Audience: contributors maintaining the Windows-Phone-inspired theme.
- Source of truth: [../../apps/web/src/themes/metro.css](../../apps/web/src/themes/metro.css) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Clean & Minimal
- **Label / icon:** "Metro" / `Building2`
- **Role:** Flat, tile-based, high-contrast digital aesthetic. The only theme currently leaning on sharp 2px corners.

## Palette & Typography

- Primary green `#60a917`, charcoal background `#1d1d1d`, saturated accents: yellow `#ffd426`, cyan `#00befc`, red `#ff3b30`, green `#60a917`.
- Card front charcoal `#3c3c3c`, card back bright yellow `#ffd426`, gray borders `#5e5e5e`.
- Card radius 2px, no card shadow — the theme intentionally avoids depth.
- Typography: inherited.

## Current Features

- Card back renders a 4-colour conic gradient (teal / red / cyan / blue quadrants) via `.back::before`.
- Skip-Bo card has a yellow top band and a striped multi-color bottom band.
- Victory pattern is a 24px crosshatch grid (two repeating linear gradients at 90°) with 0.12 opacity, animated at 16s.
- Victory burst pieces are 11×11px squares (0 border-radius) in yellow / red / cyan / green.
- Winner player area drops its shadow (`box-shadow: none`) to stay flat.

## Improvement Ideas

- **Live-tile flip on card backs.** The theme is named Metro, but today it reads as "flat dark with a conic gradient". A slow 180° Y-axis flip every ~15-30s — staggered across card-holder siblings — revealing a secondary conic pattern on the back face would earn the name. Requires `perspective` on `.card`, `transform-style: preserve-3d` on `.back`, a second `::after` face rotated 180°, and `backface-visibility: hidden` on both faces. Must be gated by `prefers-reduced-motion`.
- **Accent-color card bands.** Windows Phone tiles used one accent per tile. Let the number-range groups (`--card-g1..g3`) each claim a solid accent on the card face — a strip or corner block — instead of using them only as text color.
- **Chevron drop indicator.** The drop indicator is currently generic; a chunky right-pointing chevron would echo the "next" arrows used throughout the Metro language.
- **Victory crosshatch intensification.** On victory, ramp the crosshatch opacity from 0.12 to ~0.4 over the win animation so the grid reads as "the Start screen lights up" rather than an unchanging background.
