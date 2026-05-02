# Paper

## Document Contract

- Purpose: describe the `theme-paper` look and record improvement ideas.
- Audience: contributors tuning the paper theme or using it as a baseline for new themes.
- Source of truth: [../../apps/web/src/themes/paper.css](../../apps/web/src/themes/paper.css) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Stationery & Handwritten
- **Label / icon:** "Papier" / `NotebookPen`
- **Role:** Default light theme. Notebook page with handwritten ink — calm, readable, with personality.

## Palette & Typography

- Primary ink blue `#1e3a8a`, paper cream `#f1e7cc`, ink red accent `#b5121b`, ink green `#3f6e3f`.
- Card front cream `#fbf6e7`, soft sepia text `#2c2517`, dashed empty placeholders.
- Typography: `Caveat` (handwritten) for body, titles, labels and card numbers; falls back to Kalam / Bradley Hand / Comic Sans / cursive.

## Current Features

- Body background composes three layers: red left margin line, repeating ruled-line pattern (32px), and a paper-grain SVG noise. All `background-attachment: fixed`.
- Spiral wire binding pinned to the left edge via `body::before` (hidden under 640px viewports to keep narrow layouts clean).
- Ink blot decoration in the bottom-right corner via `body::after`.
- Cards: ruled lines on `.normal-card`; dashed border on `.empty-card`; ink-blot SVG behind the wordmark on `.skipbo-text`; quill-feather ornament on `.back`.
- Card group colors are ink-toned (green / red / blue) instead of saturated primaries.

## Improvement Ideas

- **Slight card rotation.** Per-card random tilt in the 0.5–1.5° range to look pinned by hand, applied only to static cards (not during animations).
- **Ink wash on selection.** Replace the global selection ring with a soft ink halo on the active card.
- **Doodles in margins.** Tiny stars or arrows in the left margin near the active player to reinforce the notebook metaphor.
- **Page corner curl.** Bottom-right corner shadow/curl to emphasize the paper sheet feel.
