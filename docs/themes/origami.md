# Origami

## Document Contract

- Purpose: describe the `theme-origami` look and record improvement ideas.
- Audience: contributors maintaining the folded-paper Japanese theme.
- Source of truth: [../../apps/web/src/themes/origami.css](../../apps/web/src/themes/origami.css) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Soft & Playful
- **Label / icon:** "Origami" / `Bird`
- **Role:** Folded-paper Japanese aesthetic. Replaces the previous Pastel theme in the soft-playful slot with a stronger visual identity (paper geometry + cherry-tree motif) while staying in the gentle, low-contrast register.

## Palette & Typography

- Dusty blue-grey background `#b9cdcb`, ivory card fronts `#fdf8ee`.
- Pink ramp from rose pale `#f7dde3` → rose mid `#d77a9a` → magenta `#a82960` → magenta deep `#8a1f4a`.
- Number ranges: 1-4 rose mid, 5-8 magenta, 9-12 magenta deep.
- Typography: Shippori Mincho (Japanese serif) for titles and card numbers.

## Current Features

- Body background tiles a custom SVG of origami flowers (8-petal stars with bicolor light/shade triangles for the folded-paper illusion) in five sizes and four palette variations, layered over a soft blue-grey gradient.
- Card front shows a folded-corner motif on the **top-right**: a magenta-deep triangle (the paper's reverse) with a soft crease shadow underneath, scaled up at desktop breakpoints.
- Card back is a 135° two-tone diagonal (magenta deep / rose pale) with a thin ivory inner border evoking washi paper.
- Victory pattern tiles a folded swan (corps + S-curve neck + beak + folded wing) plus diamond confetti pieces.
- Victory burst pieces are diamond-shaped (rotated 45° squares).

## Improvement Ideas

- **Paper grain.** Add a very low-opacity fibrous noise texture on the body to reinforce washi paper (not on the cards — they should stay clean).
- **Crease animation on hover.** Slightly darker fold-shadow on `.card.normal-card:hover::before` to suggest the paper "lifting" when picked up.
- **Animated swans on victory.** A horizontal slow drift on `--victory-pattern-image` would mimic swans gliding; matches the existing pattern-drift animation contract.
