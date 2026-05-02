# Themes

## Document Contract

- Purpose: index the project's visual themes, explain how they are categorized, and link to per-theme notes describing current behavior and proposed refinements.
- Audience: contributors and agents making visual changes, adding new themes, or tuning existing ones.
- Source of truth: the CSS files under [../../apps/web/src/themes/](../../apps/web/src/themes/) and the registry in [../../packages/game-core/src/types/index.ts](../../packages/game-core/src/types/index.ts). The per-theme files in this folder cite those files for current behavior; their improvement sections are intentionally non-normative.
- When to update: when a theme is added, removed, or renamed; when category boundaries shift; when an improvement idea is adopted or discarded.

## Registry

Themes are declared as an immutable list in [../../packages/game-core/src/types/index.ts](../../packages/game-core/src/types/index.ts) and rendered through the `ThemeProvider` in [../../apps/web/src/Root.tsx](../../apps/web/src/Root.tsx). Each theme is a CSS class (`.theme-<name>`) applied to `<html>` by `next-themes`. The contract enforced by [../../apps/web/tests/ui/theme-contract.spec.ts](../../apps/web/tests/ui/theme-contract.spec.ts) requires every theme to define `--background`, `--foreground`, `--selected-border-color`, and `--card-g1`, and to render a valid snapshot.

## Categorization

Themes group into five categories along a mood / visual-language axis. The goal is that each category covers one recognisable "kind of table" a player might want to sit at, and the set balances across them so picking a theme feels like choosing a vibe rather than flipping a color.

| Category | What it looks like | Themes |
|---|---|---|
| **Clean & Minimal** | Flat surfaces, restrained palettes, no texture. The card is the star. | [paper](paper.md), [dark](dark.md), [metro](metro.md) |
| **Soft & Playful** | High-key palettes, rounded shapes, decorative backgrounds. Reads as friendly and casual. | [pastel](pastel.md), [bonbon](bonbon.md), [rainbow](rainbow.md) |
| **Retro & Vintage** | Era-specific palettes and shapes, reference-driven, avoids modern effects. | [retro](retro.md), [retro-space](retro-space.md) |
| **Futuristic & Digital** | Glow, blur, animated gradients, high contrast, lean into screen-native effects. | [neon](neon.md), [glass](glass.md) |
| **Tactile & Crafted** | Imitates physical materials — yarn, blocks, brass. Heavy use of textures. | [wool](wool.md), [minecraft](minecraft.md), [steampunk](steampunk.md) |

Retro & Vintage and Futuristic & Digital currently hold only two themes each, while the other three hold three. This is the clearest place to add new themes if the registry grows.

## Shared Tokens

Every theme customises a CSS custom-property contract declared at `:root` in [../../apps/web/src/index.css](../../apps/web/src/index.css). Token families:

- **Palette:** `--primary`, `--secondary`, `--success`, `--accent`, `--destructive`, `--muted` and their `*-foreground` pairs, plus `--popover`, `--border`, `--ring`.
- **Surface:** `--background`, `--foreground`, `--text-color`, `--title-color`.
- **Card:** `--card-front-color`, `--card-border-color`, `--card-back-color`, `--card-back-bg`, `--card-shadow`, `--card-radius`, `--card-g1|g2|g3` (number-range colors).
- **Skip-Bo card:** `--skipbo-text`, `--skipbo-bg`.
- **Interaction:** `--selected-border-color`, `--selected-shadow`, `--drop-indicator-color`, `--can-drop-shadow`, `--active-turn-color`.
- **Victory:** `--victory-border`, `--victory-accent`, `--victory-accent-soft`, `--victory-piece-1..4`, `--victory-burst-size`, `--victory-burst-distance-scale`, `--victory-pattern-image|size|opacity|drift-to|animation`, `--victory-shine-opacity|duration`, `--victory-emblem-image|opacity`.

A theme that only overrides the palette produces a minimal look. A theme that also overrides `--card-back-bg`, surface backgrounds, and victory tokens produces a full identity. Heavy themes additionally render decorative `::before`/`::after` layers on `.card`, `.back`, `.skip-bo`, player areas, and `body`.

## Aesthetic Philosophy

- **Readability beats ornament.** Numbers on cards must stay legible at a glance; decoration happens on backs, empty slots, and backgrounds, not over the numbers.
- **The table has a mood.** Background, player area, and card-back treatment are where a theme earns its name. A recoloured palette alone is not an identity.
- **Motion is polish, not payload.** Animations are welcome (`neon`, `rainbow`, `retro-space`, `glass` all use them) but must respect `prefers-reduced-motion` and must not compete with gameplay feedback (selection glow, drop shadows, turn highlight).
- **Each theme should be recognisable in one glance.** A screenshot of the table alone, without the theme switcher, should tell a reader which theme is active. When a theme fails that test, the fix belongs in the category it claims — e.g. a Retro theme should read as retro, not merely "warmer dark mode".

## Per-Theme Notes

- [paper](paper.md)
- [dark](dark.md)
- [pastel](pastel.md)
- [bonbon](bonbon.md)
- [rainbow](rainbow.md)
- [metro](metro.md)
- [neon](neon.md)
- [retro](retro.md)
- [retro-space](retro-space.md)
- [glass](glass.md)
- [wool](wool.md)
- [minecraft](minecraft.md)
- [steampunk](steampunk.md)

Each per-theme file describes current behavior (normative, anchored in the CSS file) and lists improvement ideas (non-normative, candidates for future work).
