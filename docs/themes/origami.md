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

- Body background tiles a custom SVG of 6-petal origami flowers (each petal split into a light + shade half by a central crease for the folded-paper illusion) in five sizes and four palette variations, layered over a soft blue-grey gradient.
- Card face is a two-tone diagonal split: cream top-left, range tint bottom-right. The range tint comes from `--card-g{1,2,3}` so 1-4 / 5-8 / 9-12 read at a glance without recolouring the digit.
- Card face has a folded-corner motif at the **top-right**: a magenta-deep triangle (the paper's reverse) cut into the card outline via `clip-path`, with a soft crease shadow underneath. Sized via `--plied-corner-size` (12px / 16px desktop).
- Card back uses a `-135°` two-tone diagonal (magenta deep / rose pale) with a thin ivory inner washi border, and its **top-left** corner is clipped — mirroring the face's fold so the same physical corner appears missing when the card is flipped.
- Skip-Bo cards display a folded paper crane (orizuru) silhouette built from layered triangular facets (body, two wings, S-curve neck, head, beak, tail) over the cream washi face, with the "Skip-Bo" label set in Shippori Mincho at top.
- Victory pattern tiles a folded swan plus diamond confetti pieces; victory burst pieces are diamond-shaped (rotated 45° squares).

## Improvement Ideas

- **Paper grain.** Add a very low-opacity fibrous noise texture on the body to reinforce washi paper (not on the cards — they should stay clean).
- **Crease animation on hover.** Slightly darker fold-shadow on `.card.normal-card:hover::before` to suggest the paper "lifting" when picked up.
- **Animated swans on victory.** A horizontal slow drift on `--victory-pattern-image` would mimic swans gliding; matches the existing pattern-drift animation contract.
