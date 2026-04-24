# Steampunk

## Document Contract

- Purpose: describe the `theme-steampunk` look and record improvement ideas.
- Audience: contributors maintaining the brass-and-gears theme.
- Source of truth: [../../apps/web/src/themes/steampunk.css](../../apps/web/src/themes/steampunk.css) and the texture at [../../apps/web/src/themes/textures/steampunk-clockwork.png](../../apps/web/src/themes/textures/steampunk-clockwork.png) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Tactile & Crafted
- **Label / icon:** "Steampunk" / `Cog`
- **Role:** Victorian industrial — brass, bronze, parchment, gears. The theme with the most ornate Skip-Bo card treatment.

## Palette & Typography

- Warm metallics: brass `hsl(37 61% 47%)`, bronze `hsl(27 32% 32%)`, aged plum `#7b5a6e`, patina teal `#4f7a6d`, parchment `#f1e3c9`.
- Body background workshop charcoal `#1f1a14`, card front parchment `#f1e3c9`, card back aged leather / bronze `#463a2f`, burnished-brass borders `#6b5640`.
- Card radius 12px; standard shadows.
- Typography: inherited.

## Current Features

- Body combines an SVG gear overlay (very low opacity `#e0a84f` 6%), a blueprint grid (repeating linear gradients at 28px, 4%), and a dark gradient.
- Player area shows rivets at all four corners (radial gradients positioned precisely).
- Card backs add a rivet grid at 12px spacing, a diagonal brass tint, and a brushed texture.
- **Skip-Bo card is the centerpiece:** a mask-composited "machine window" reveals the `steampunk-clockwork.png` background (visible cogs), framed by an ornate parchment border shaped via SVG `mask-image`.
- Empty cards use a dashed brass outline with an ornate shadow.
- Normal cards overlay a compass-rose SVG (50% opacity) with inset panel seams and domed rivets.
- Victory tokens use brass / copper / patina / plum but no custom burst shape.

## Current Strengths

Alongside [retro-space](retro-space.md), one of the most committed theme identities. Every surface speaks the same material language.

## Improvement Ideas

- **Rotating clockwork on the Skip-Bo card.** Animate the `steampunk-clockwork.png` background with a slow 40-60s rotation so the visible gears actually turn. Single keyframe, huge payoff. Must gate on `prefers-reduced-motion`.
- **Brass glint sweep on card-back hover.** A diagonal gradient sweep across card backs on hover (similar to [retro-space](retro-space.md)'s flyby but shorter) would make the metallic surface read as polished on interaction.
- **Steam release on victory.** A short puff of 3-4 white/gray radial gradients rising and fading from the winner's area would give the theme a dedicated win beat; the current victory inherits defaults, which reads as generic confetti on an otherwise committed theme.
- **Animated pressure gauge on active turn.** Replace the active-turn outline with a tiny gauge dial in the top-left corner whose needle sweeps as the turn elapses. Non-trivial, but meaningfully on-theme.
- **Period-appropriate headline font.** A classical serif (e.g. Cinzel, IM Fell) on titles would finish the Victorian identity the visuals already promise.
