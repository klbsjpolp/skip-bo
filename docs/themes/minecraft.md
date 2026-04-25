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
- Ambient particles now drift slowly across the body background as tiny 4×4px squares in XP green, redstone red, and portal purple via fixed CSS layers behind the board.
- Active player area uses a `netherite` border texture.
- Skip-Bo card layers `obsidian.webp` with `diamond.webp` overlay.
- Card backs include a sword overlay.
- Victory burst uses a Minecraft firework star animation: 3 rockets fire in sequence, each ascending as a thin vertical spark trail, flashing at peak, then bursting into a 12-particle star spread in XP green / redstone red / portal purple / diamond cyan, before drifting down with gravity and fading. Piece colors override `--victory-piece-1/2/3/4` to match the ambient palette.
- All textures are 80×80px webp, rendered pixelated.

## Improvement Ideas

- **Break-block animation on card play.** When a card is played, a quick 3-frame "cracking" overlay (small SVG or CSS art) then disappear could mimic block-breaking. Should respect the shared animation gate to avoid stacking.
- **Biome-based player tinting.** Human player area uses grass biome; AI player area could use a different biome (e.g. desert, nether, snow) so the two sides feel like distinct worlds rather than the same field.
- **Iconic drop indicator.** The drop indicator could render as a tiny pickaxe or a block outline, matching the theme's gaming vocabulary.
