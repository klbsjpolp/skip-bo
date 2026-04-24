# Rainbow

## Document Contract

- Purpose: describe the `theme-rainbow` look and record improvement ideas.
- Audience: contributors maintaining the rainbow theme.
- Source of truth: [../../apps/web/src/themes/rainbow.css](../../apps/web/src/themes/rainbow.css) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Soft & Playful
- **Label / icon:** "Arc-en-ciel" / `Rainbow`
- **Role:** Bright, cheerful, sky-and-clouds table. High saturation, low visual complexity.

## Palette & Typography

- Primary red `hsl(0 100% 70%)`, sky-blue background `#87ceeb`, success green `#4caf50`, purple border `#9381ff`.
- Card front white, card back a vertical red → orange → yellow → green → blue → indigo → violet gradient; 12px radius.
- Typography: inherited.

## Current Features

- Body background animates cloud shapes (ellipse radial gradients) drifting left-to-right over a 90s loop.
- Skip-Bo card uses a radial spectrum ring overlay with computed band widths.
- Discard piles have a hover glow with a purple hue.
- Victory pattern uses a custom stars SVG; burst pieces are yellow / orange / blue / purple.

## Improvement Ideas

- **Real rainbow arc on victory.** Overlay a conic-gradient arc (clipped through an SVG path) across the winner's area so the theme's name pays off at the moment it matters most.
- **Sky-time drift.** Slowly shift the body background hue across a long cycle (2-3 min) between dawn warm, midday blue, and dusk pink. Subtle enough not to distract, enough to make a long game feel alive.
- **Synced cloud + pattern.** The victory stars pattern currently reads as unrelated to the cloud drift. Synchronising them (same drift direction, staggered by a few seconds) would make the win feel like "the clouds parted to reveal stars".
- **Band-aligned range colors.** `--card-g1..g3` currently don't obviously match the rainbow back. Picking them from the gradient's red / green / violet bands would make the theme internally coherent.
