# Glass

## Document Contract

- Purpose: describe the `theme-glass` look and record improvement ideas.
- Audience: contributors maintaining the liquid-glass theme.
- Source of truth: [../../apps/web/src/themes/glass.css](../../apps/web/src/themes/glass.css) and the shared utility [../../apps/web/src/themes/utils/liquid-glass.css](../../apps/web/src/themes/utils/liquid-glass.css) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Futuristic & Digital
- **Label / icon:** "Verre" / `Squircle`
- **Role:** Modern frosted-glass UI. Leans heavily on `backdrop-filter` and translucency for a contemporary OS feel.

## Palette & Typography

- Primary blue `#6786d3`, body background `#2d6698`, card back deep indigo `#1f3a8a`, borders blue-gray `#5b6470`.
- Accent gold (x3) + cyan pieces for victory.
- Card front is transparent; fronts rely entirely on backdrop-filter to read as glass.
- Card radius is dynamic (`calc(var(--card-height) / 8)`) — the only theme that scales corner radius with card size.
- Typography: inherited.

## Current Features

- Body background is a blue gradient overlaid with a moving SVG line pattern (60s `glass-texture-pan`).
- Card backs render a "cracked glass" effect: conic gradients emanate as rays from origin `82% 82%`, with concentric halos.
- Skip-Bo card is a 6-panel glass mosaic (azure / coral / mint / amber / lavender / pink) with `color-mix` transparency and its own backdrop-filter.
- Player and center areas use the `liquid-glass` utility: backdrop-filter blur, color-mix border gradient, animated background-position for a subtle shimmer.
- Active player's area flips its inner glass color to near-white for visibility.
- Victory intentionally disables default burst/shine (`display: none`) and relies on gradient overlay alone.

## Current Strengths

The theme commits to a single idea (transparency + motion) and executes it consistently — every surface honors the same material language. Improvement ideas focus on variety within that language.

## Improvement Ideas

- **Refraction highlight on card hover.** A moving gradient sheen across the card front on hover (like light catching real glass) would make the theme feel alive during normal play, not only during idle animation.
- **Re-enable victory beat in-material.** Replacing the disabled burst/shine with a "glass shatters into particles" effect (burst pieces styled as small translucent shards with a short rotate) would give the theme a dedicated win beat without breaking the material language.
- **Depth tint on stacked piles.** Slightly increase the blur radius of cards deeper in a pile (via `--stack-index` variable) so piles read as physically layered rather than visually coplanar — plays directly to the strength of the material.
- **Reduced-motion baseline check.** The theme currently animates background-position and the line-pattern pan even when motion is available; verify the `prefers-reduced-motion` media query in the liquid-glass utility disables both, since sustained motion on a heavily-blurred surface is a likely comfort issue.
