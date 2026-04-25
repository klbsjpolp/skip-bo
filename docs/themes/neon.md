# Neon

## Document Contract

- Purpose: describe the `theme-neon` look and record improvement ideas.
- Audience: contributors maintaining the cyberpunk / synthwave theme.
- Source of truth: [../../apps/web/src/themes/neon.css](../../apps/web/src/themes/neon.css) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Futuristic & Digital
- **Label / icon:** "Néon" / `Zap`
- **Role:** High-saturation glow on black; the theme with the most animation layered on top of a relatively minimal structure.

## Palette & Typography

- Primary hot pink `#ff0099`, success neon green `#00ff88`, cyan `#00d4ff` accents on a black `#0a0a0a` body.
- Card front `#1a1a1a`, neon-green border `#00ff88`, 12px radius, neon-green glow shadow (`0 0 10px rgba(0,255,136,0.3)`).
- Typography: inherited (the glow does the work).

## Current Features

- Card back animates a 135° pink/green/blue/pink gradient (`neonShift`, 6s) with an overlayed blurred glow (`neonDrift`, 9s) via `::before`, and faint scanlines via `::after`.
- Skip-Bo card gets an oversized neon glow, scanline overlay, and the same animated gradient.
- Skip-Bo text now carries a VHS chromatic aberration effect: a magenta shadow offset -2px left and a cyan shadow offset 2px right, layered behind the standard multi-layer glow.
- Multi-layer text-shadow produces the glow effect on text.
- A synthwave perspective grid floor is rendered via `body::before` (cyan horizontal / pink vertical repeating lines, `perspective(400px) rotateX(50deg)`) with `body::after` fading it into the background colour at the bottom edge.
- Card selection triggers a `neonCardTrail` animation (200ms ease-out) — a vivid multi-layer green glow decays to the resting shadow, selling the "electric current" metaphor.
- Victory pieces are saturated green / pink / cyan / yellow; the default burst gains the neon treatment through theme tokens.

## Improvement Ideas

- **Synced flicker on the winner.** A very short, low-opacity flicker (e.g. 2-3 sub-second dips in brightness) on the winner's player area right before the burst would sell the "neon sign tripping on" moment.
