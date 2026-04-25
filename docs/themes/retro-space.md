# Retro Space

## Document Contract

- Purpose: describe the `theme-retro-space` look and record improvement ideas.
- Audience: contributors maintaining the mid-century sci-fi theme.
- Source of truth: [../../apps/web/src/themes/retro-space.css](../../apps/web/src/themes/retro-space.css) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Retro & Vintage
- **Label / icon:** "Espace" / `Rocket`
- **Role:** 1950s–1960s space-race aesthetic — cream, copper, deep navy, dense grids and astronomical iconography.

## Palette & Typography

- Deep navy body `#07111d`, secondary navy `#122134`, cream card front `#e7ddcf`, copper `#d87939`, cyan `#7fd4d7`, gray-blue borders `#8d98a1`.
- Card radius 14px; layered card shadows (`0 10px 22px + 0 1px 0`).
- Typography: **Avenir Next Condensed / Segoe UI**, uppercase, `letter-spacing: 0.08em` — the only condensed / uppercase theme in the project.

## Current Features

- Body background combines a nebula-like radial gradient, a starfield made of tiny radial dots, a dashed grid, and a slow drift animation (`retroSpaceVictoryFlyby` on victory).
- Card backs are dense — concentric rings, stellar crosshairs, and a copper inset border — evoking a telescope reticle.
- Skip-Bo card centers a planet-like multi-layer radial gradient with a labeled banner at the bottom.
- Player areas use differently-tinted grids for human vs AI areas (cyan vs copper), reinforcing identity at a glance.
- Victory bursts use a 12-point star polygon (clip-path); victory shine is a custom 5.2s cubic-bezier flyby.

## Current Strengths

The most identity-rich theme currently in the registry: fonts, background, card structure, victory beat, and per-player tinting all reinforce the same idea. Improvement ideas below are polish, not rescue.

## Improvement Ideas

- **Slow parallax on the starfield.** Shift the starfield layer 5–10% slower than the grid layer so the depth implied by the two backgrounds becomes visible during long sessions.
- **Orbit ring on the Skip-Bo planet.** A faint elliptical ring (border over a rotated pseudo-element) around the Skip-Bo card's central planet would reinforce the "astronomical object" reading that the card already hints at.
- **Countdown rumble before bot turn.** A very subtle screen-shake or border pulse when the AI starts thinking would fit the Mission-Control vibe without interfering with gameplay pacing.
- ~~**Second victory flyby direction.**~~ A second inbound streak (`victory-shine-inbound`) now flies right→left at `top: 68%` with a 2.6s delay and `scaleX(-1)` mirroring, so the two passes alternate on every half-cycle.
