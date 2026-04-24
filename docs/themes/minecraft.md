# Minecraft

## Document Contract

- Purpose: describe the `theme-minecraft` look and record improvement ideas.
- Audience: contributors maintaining the blocky / voxel theme.
- Source of truth: [../../apps/web/src/themes/minecraft.css](../../apps/web/src/themes/minecraft.css) and the texture assets in [../../apps/web/src/themes/textures/](../../apps/web/src/themes/textures/) for current behavior. Improvement Ideas below are non-normative.
- When to update: when the CSS changes, when ideas are adopted, or when the theme is retired.

## Identity

- **Category:** Tactile & Crafted
- **Label / icon:** "Minecraft" / `Blocks`
- **Role:** Voxel / pixel-art identity. The only theme that enforces `image-rendering: pixelated` and `border-radius: 0` globally.

## Palette & Typography

- Earthy pixel palette: dark brown `#3d2e1e`, gray `#8c8c8c`, white `#e6e6e6`, neon green `#9adf5a`, cyan `#37ceff`.
- Card front `#e5e5e5`, card back `#8c8c8c` (overridden by stone texture).
- Typography: **Monaco, monospace**, `letter-spacing: 0.01em` with 8-direction outline text-shadow for the retro pixel-font feel.

## Current Features

- Every element has `border-radius: 0` (enforced on all children via `!important`) — no rounding anywhere.
- Body background uses a `dirt.webp` tile; playable areas use `grass.webp`; empty card slots use `wood.webp`; card backs use `stone.webp`.
- Active player area uses a `netherite` border texture.
- Skip-Bo card layers `obsidian.webp` with `diamond.webp` overlay.
- Card backs include a sword overlay.
- Victory burst pieces are 14×14px cycling between `grass`, `stone`, `diamond`, `wood` textures with no rounding.
- All textures are 80×80px webp, rendered pixelated.

## Improvement Ideas

- **Ambient particle drift.** Float small 4×4px squares (XP-orb green, redstone red, portal purple) slowly across the body background during idle. Cheap via CSS keyframes, strongly reinforces the theme identity.
- **Break-block animation on card play.** When a card is played, a quick 3-frame "cracking" overlay (small SVG or CSS art) then disappear could mimic block-breaking. Should respect the shared animation gate to avoid stacking.
- **Biome-based player tinting.** Human player area uses grass biome; AI player area could use a different biome (e.g. desert, nether, snow) so the two sides feel like distinct worlds rather than the same field.
- **Iconic drop indicator.** The drop indicator could render as a tiny pickaxe or a block outline, matching the theme's gaming vocabulary.
- **Victory fireworks block.** Minecraft's on-win motif is firework stars — a burst variant that spawns 3-4 firework trails (short vertical line, puff at top) would give the theme a dedicated win beat rather than the current block-confetti.
