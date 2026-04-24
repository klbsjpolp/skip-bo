# Dark

## Document Contract

- Purpose: describe the `theme-dark` look and record improvement ideas.
- Audience: contributors maintaining the primary dark theme.
- Source of truth: [../../apps/web/src/themes/dark.css](../../apps/web/src/themes/dark.css) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Clean & Minimal
- **Label / icon:** "Sombre" / `Moon`
- **Role:** Standard dark mode — a comfortable low-light counterpart to [light](light.md).

## Palette & Typography

- Primary indigo `#6366f1`, secondary dark gray `#1f2937`, success emerald `#34d399`.
- Surface: near-black background `#0a0a0a`, charcoal card fronts `#374151`, gray borders `#6b7280`.
- Typography: inherited; no overrides.

## Current Features

- Card back is a 45° gradient from `#1d4ed8` blue to `#22c55e` green; card fronts flat charcoal.
- Card radius 8px, medium shadow, standard selection ring.
- Victory burst uses amber / pink / emerald / blue pieces; default pattern and shine.
- No background textures, no animations.

## Improvement Ideas

- **Starfield or constellation overlay.** A very low-opacity scattered-dots background would give the theme a subtle identity beyond "dark" without stepping on [retro-space](retro-space.md) (which is maximal sci-fi).
- **Card-back depth.** Add a soft inner shadow so cards read as slightly recessed against the near-black table; currently the 8px radius on flat gradient feels generic.
- **Glow on active turn.** The active-turn outline is subtle on an already-dark background — a soft indigo glow (`box-shadow: 0 0 12px var(--primary)`) would make the current player's area easier to find.
- **Range-aware card-back gradient.** Swap the fixed blue→green gradient for a subtle dual-tone derived from `--card-g1` and `--card-g3`, so the theme's identity is tied to its palette rather than hard-coded colors.
