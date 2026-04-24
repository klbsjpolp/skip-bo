# Light

## Document Contract

- Purpose: describe the `theme-light` look and record improvement ideas.
- Audience: contributors tuning the default light theme or using it as a baseline for new themes.
- Source of truth: [../../apps/web/src/themes/light.css](../../apps/web/src/themes/light.css) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Clean & Minimal
- **Label / icon:** "Clair" / `Sun`
- **Role:** Accessible default; the reference point other themes diverge from.

## Palette & Typography

- Primary indigo `#4f46e5`, secondary near-white `#f9fafb`, success green `#22c55e`.
- Surface: light gray background `#e5e7eb`, white card fronts, medium-gray borders `#9ca3af`.
- Typography: inherited Inter stack from the base; no theme-specific overrides.

## Current Features

- Card back is a 45° linear gradient from green `#22c55e` to blue `#3b82f6`; no decorative overlay on the face.
- Card radius 8px, light drop shadow, standard selection ring.
- Victory burst uses red / orange / green / blue squares over the default pattern; no custom emblem or shine override.
- Table and player areas use the flat `--background` with no textures or gradients.

## Improvement Ideas

- **Subtle paper texture.** Add a very low-opacity noise or paper-grain filter to the body background so the theme reads as "paper" rather than "untreated gray". Keeps the minimal feel but gives it a name.
- **Gentle card-back accent.** Replace the green-to-blue gradient with a token-aware gradient that follows `--card-g1..g3` so the back visually hints at the range palette used on the faces.
- **Active-turn warmth.** The active-turn highlight inherits the default blue; a warm secondary (amber) would separate it from the indigo primary at a glance.
- **Typography confidence.** Pair the theme with a single display font for headings (e.g. Inter Tight) so the "default" theme still has a voice; currently it reads as unstyled rather than intentional.
