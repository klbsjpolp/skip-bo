# Bonbon

## Document Contract

- Purpose: describe the `theme-candy` look and record improvement ideas.
- Audience: contributors maintaining the candy-inspired theme.
- Source of truth: [../../apps/web/src/themes/candy.css](../../apps/web/src/themes/candy.css) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Soft & Playful
- **Label / icon:** "Bonbon" / `Candy`
- **Role:** The most decorated theme in the registry — pink, whimsical, unapologetically sweet.

## Palette & Typography

- Primary hot pink `#ff76a5`, very pale pink background `hsl(332 100% 96%)`, cyan / gold / purple secondaries.
- Card front near-white `#fffafc`, bright-pink borders `#ff8eb5`, 16px radius.
- Typography: Trebuchet MS → Arial Rounded → `ui-rounded` with added letter-spacing, the roundest stack in the project.

## Current Features

- Body background combines radial gradients (pink / cyan / gold orbs) with a repeating 135° diagonal stripe pattern for a layered "candy shop" feel.
- Skip-Bo card is rendered as a stylised lollipop: conic rainbow gradient head, striped stick, nested shadows.
- Card backs use six-color striped panels (135° gradient pairs).
- Player and center areas add `backdrop-filter: blur(10px)` plus a gradient overlay and a thick outline for a frosted-glass inset effect.
- Buttons lift on hover with a soft shadow.
- Victory pieces: pink / gold / cyan / purple on the default pattern.

## Improvement Ideas

- **Sparkle motes on victory.** Small fading stars or sparkles emitting from the winner's area would match the confectionery identity and give the theme a dedicated victory beat.
- **Wrapper-twist animation on Skip-Bo card.** A very slow continuous rotation of the lollipop's conic rainbow (e.g. `animation: 18s linear infinite`) would echo real candy wrappers without being distracting.
- **Card-back candy variants.** Rotate between three card-back stripe patterns by index so the table looks like a mixed bag of sweets rather than 30 copies of the same wrapper.
- **Soft pop on hover.** Pair the existing button lift with a 1.02x scale on hoverable cards so the theme feels universally bouncy, not only in button chrome.
