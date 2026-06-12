# Cinéma muet

## Document Contract

- Purpose: describe the `theme-cinema` look and record improvement ideas.
- Audience: contributors maintaining the 1920s silent-film theme.
- Source of truth: [../../apps/web/src/themes/cinema.css](../../apps/web/src/themes/cinema.css) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Retro & Vintage
- **Label / icon:** "Cinéma muet" / `Film`
- **Role:** Strictly monochrome 1920s picture-house nostalgia — a darkened theater, a projector beam, film grain, and silver-nitrate cards. Reads as a silent-movie still.

## Palette & Typography

- Pure grayscale: near-black stage `#121212`, silver-cream text `#e9e5da`, nitrate card faces `#e9e4d6`, ink numbers.
- Number ranges are three shades of ink: black `#141414` (1–4), dark gray `#444444` (5–8), mid gray `#757575` (9–12) — the only theme that separates ranges by value instead of hue.
- Titles and card numbers use `Cinzel` (already imported for midnight); body copy falls back to Georgia/serif. Headings are uppercase with wide tracking, like intertitle cards.
- Selection and drop affordances glow pure white — the projector picking the card out of the dark.

## Current Features

- Body layers a projector beam (top radial), a vignette, an SVG `feTurbulence` film-grain tile, and a near-black base; a fixed `body::before` adds faint vertical scratch lines with a flicker animation (disabled under `prefers-reduced-motion`).
- Two Hollywood-premiere searchlights (html `::after` + `body::after`) rise from the bottom edge as conic-gradient light cones with a lamp glow at the base; they hold their angle and sweep to a new one once in a while (`cinemaSearchlightLeft`/`Right`, desynchronized 27s/34s cycles, disabled under `prefers-reduced-motion`).
- Card backs are a film-strip SVG: sprocket holes down both edges, a double frame, and an art-deco rising sun.
- The Skip-Bo card is an intertitle title card — black face, double silver frame (`border` + offset `outline` on `.card-inner::before`), italic serif wordmark.
- Numbered card faces carry a subtle photographic vignette over a silver gradient, framed as an Academy-leader countdown: a faint crosshair, two concentric circles, and a clock-wipe wedge whose sweep is proportional to the value (`value / 12` of a full turn, darker line at the leading edge) — every value is visually unique and the art encodes the number.
- Player and center areas are dark panels with an inner 1px silver frame, echoing intertitle borders; their `bg-layer` reuses the grain tile.
- The winner area pulses in a white spotlight (`cinemaSpotlight`), with a film-reel victory emblem and white sparkle pattern; burst pieces are four grays.
- Empty piles recede: transparent fill, dashed silver outline.

## Improvement Notes

- A "FIN" title-card flourish on game end could replace the generic shine layer.
- The countdown wedge now distinguishes every value; outlined numerals for 9–12 remain an option if ink-shade range separation is ever revisited.
- An iris-in/iris-out transition on dialog open would deepen the reference, if it can respect `prefers-reduced-motion`.
