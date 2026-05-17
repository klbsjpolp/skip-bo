# Theming & CSS Guide

This document is the source of truth for how CSS is organized and how themes work in `apps/web`. Read it before adding a theme, adding a utility, or touching the global stylesheet.

## 1. Overview

- **Tailwind CSS 4.3** with the `@tailwindcss/vite` plugin. No `tailwind.config.*` file — every project token is declared in CSS via the `@theme` block in [`src/index.css`](../index.css).
- **Themes** are pure CSS — each one is a single `.theme-<name>` class that overrides design tokens and adds theme-specific decorations via native CSS nesting.
- **Theme switching** is owned by [`next-themes`](https://github.com/pacocoursey/next-themes). It puts a class on `<html>` (e.g. `class="theme-midnight"`); the CSS cascade does the rest. The selected theme is persisted to `localStorage` under the key `theme`.
- Legacy theme values are migrated at bundle load by [`src/lib/themeMigration.ts`](../lib/themeMigration.ts).

## 2. File map

```
src/
  index.css                  ← orchestration only (imports + @theme + @custom-variant)
  styles/
    base.css                 ← Tailwind v3→v4 border compat, :root tokens, typography, prefers-reduced-motion
    layout.css               ← player-area, center-area, hand-area, build/discard piles, etc.
    card.css                 ← .card utility, ranges, skipbo-text, placeholder, corner numbers
    drag.css                 ← drop-indicator, drop-target-hover, drag-source/ghost rules
    victory.css              ← winner border, victory layers, burst keyframes
    animations.css           ← card-flight, popper-animations, neon/glass keyframes
    utilities.css            ← project-wide utilities (container, vertical-text, text-muted-sm)
  themes/
    <name>.css               ← one per theme — see template below
    utils/
      liquid-glass.css       ← shared utility consumed by glass.css
    README.md                ← (this file)
```

## 3. Tailwind 4 conventions (project rules)

These are conventions for **this project**. Tailwind 4 itself permits more than what we use here — these rules are about consistency, readability, and grep-ability, not Tailwind correctness.

### 3.1 `@theme` lives only in `index.css`

It binds project CSS variables (`--background`) to Tailwind names (`--color-background` → enables `bg-background`). **Themes never re-bind tokens here** — they override the underlying CSS variable on their `.theme-<name>` class.

### 3.2 `@utility` vs `@apply`

- **`@utility`** defines a named project utility. Use it when the same composition is needed in ≥2 places or when a name adds semantic meaning that the raw classes don't.
- **`@apply`** composes existing Tailwind utility classes inside a CSS rule. This is what the [official docs](https://tailwindcss.com/docs/functions-and-directives#apply-directive) describe it for.

**Project rule:** when the value being set is `var(--foo)`, write the native CSS rule instead of routing through `@apply text-(--foo)`. So:

```css
/* ✅ project style */
@utility card {
  @apply flex items-center justify-center font-bold cursor-pointer text-3xl;
  color: var(--card-color);
  background-color: var(--card-front-color);
  border: 1px solid var(--card-border-color);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
}

/* ❌ avoid in this project — Tailwind allows it, but the variable usage gets
   hidden behind Tailwind's arbitrary-value syntax */
@utility card {
  @apply text-(--card-color) bg-(--card-front-color) rounded-(--card-radius)
    border border-(--card-border-color) shadow-(--card-shadow)
    flex items-center justify-center font-bold cursor-pointer text-3xl;
}
```

Reasoning:

- `color: var(--card-color)` is one line of normal CSS, immediately understood without Tailwind knowledge.
- It's grep-friendly: `rg "color: var\(--card-color"` finds it; `rg "text-\(--card-color"` is Tailwind-syntax-specific.
- It skips one layer of class-name transformation at build time.

**Don't ban `@apply`.** Composing Tailwind utilities into a named project class is exactly what it's for. The rule is only about CSS-variable assignments.

**Other direction: prefer Tailwind utilities for literal-value properties.** When a property's value has a Tailwind utility (`position: fixed` → `fixed`, `width: 1.5rem` → `w-6`, `pointer-events: none` → `pointer-events-none`, `opacity: 0.55` → `opacity-55`, `display: none` → `hidden`, etc.), prefer the `@apply` form over the native CSS rule. It reads as one declaration line, keeps the rule aligned with how the same properties are written in component className strings, and composes naturally with breakpoint / state / dark / motion-reduce variants:

```css
/* ✅ literal values via @apply, CSS-variable values native */
.victory-burst-piece {
  @apply absolute top-1/2 left-1/2 opacity-0 will-change-[transform,opacity];
  width: var(--victory-burst-size);
  height: calc(var(--victory-burst-size) * 1.6);
  background: var(--piece-color);
  animation: victoryPieceBurst 3000ms cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

/* ❌ everything as native CSS when most properties had matching utilities */
.victory-burst-piece {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--victory-burst-size);
  height: calc(var(--victory-burst-size) * 1.6);
  background: var(--piece-color);
  opacity: 0;
  animation: victoryPieceBurst 3000ms cubic-bezier(0.16, 1, 0.3, 1) infinite;
  will-change: transform, opacity;
}
```

The rule remains: **`var(--foo)` values stay native CSS**; literal values prefer Tailwind utilities. Edge cases that have no Tailwind equivalent (`writing-mode: sideways-rl`, complex multi-layer `background-image`, `mask-image`, `transform` strings with custom-property interpolation, etc.) stay as native CSS too.

### 3.3 Native CSS nesting everywhere

Use `&` for descendants inside `@utility` blocks and inside theme blocks. Mirror Tailwind's modifier philosophy: `&.selected`, `&::before`, `&:hover`.

```css
@utility drop-indicator {
  @apply relative;
  border-radius: var(--card-radius);

  &.can-drop:hover {
    box-shadow: var(--can-drop-shadow);

    &::before {
      @apply content-[''] absolute z-10 border-dashed border-2;
      border-color: var(--drop-indicator-color);
    }
  }
}
```

### 3.4 Single-block themes

Every selector for a theme lives inside one `.theme-<name>` block. The only exception is `@keyframes` — CSS spec forbids nesting them inside a selector, so they stay top-level at the bottom of the file.

```css
.theme-paper {
  --background: ...;
  /* ...tokens... */

  & body {
    background-image: ...;
  }
  & .card {
    /* tweaks */
  }
  & .card.skipbo-text {
    /* Skip-Bo */
  }

  & body::before {
    @variant max-sm {
      display: none;
    }
  }
}

@keyframes paper-foo {
  /* ... */
}
```

### 3.5 `@custom-variant` and `@variant`

- `@custom-variant` defines a new project-wide variant. The project has one: `dark (&:is(.dark *))` in `index.css`. Add new ones only when project-wide; avoid one-off variants per component.
- `@variant <name> { ... }` applies an existing variant in CSS — use it instead of writing the matching `@media` query by hand. For accessibility/responsive overrides this is the idiomatic Tailwind 4 form:

  ```css
  /* ❌ avoid */
  @media (prefers-reduced-motion: reduce) {
    .victory-burst-layer {
      display: none;
    }
  }

  /* ✅ prefer */
  .victory-burst-layer {
    @variant motion-reduce {
      display: none;
    }
  }
  ```

  Same idea for `motion-safe`, `dark`, `sm` / `md` / `lg` / `xl` / `2xl` and their `max-*` counterparts — anything Tailwind already names as a variant. Prefer `@variant lg` over `@media (width >= 64rem)` and `@variant max-sm` over `@media (max-width: 640px)`. The one exception in this repo is the `container` utility, which gates a custom `max-width: 1400px` that falls between Tailwind's `xl` (1280px) and `2xl` (1536px) — that one stays a raw `@media (min-width: 1400px)` query because no built-in variant matches.

- When the value being set has a Tailwind utility (e.g. `display: none`, `width: 1.5rem`, `position: fixed`), prefer the inline `breakpoint:utility` form inside an `@apply` chain over a `@variant <bp> { ... }` block. The override sits on the same line as the base utilities and reads as one rule:

  ```css
  /* ✅ prefer when the value has a Tailwind utility */
  @utility vertical-text {
    @apply transform rotate-180 flex items-center w-5 lg:w-6;
    writing-mode: sideways-rl;
    &:has(br) {
      @apply w-10 lg:w-12;
    }
  }

  /* ✅ still required when the value is a CSS variable */
  :root {
    @variant lg {
      --card-width: 70px;
      --card-height: 100px;
    }
  }
  ```

  Tailwind has no utility for setting a custom property, so CSS-variable responsive overrides must use `@variant <bp> { --foo: ... }`.

### 3.6 `@layer`

Used only where it materially matters for cascade winning — currently `@layer utilities` in [`styles/drag.css`](../styles/drag.css) so the `is-drag-source` visibility override reliably beats the `.card` and `lg:visible` cascades. Default: no `@layer` wrapper; rely on file import order in `index.css`.

### 3.7 Arbitrary values discouraged

`text-[12px]`, `border-[2px_dashed_var(...)]` and friends sneak typed values into the markup. Either add a design token (`--text-2xs` already exists for the small case) or write native CSS in a `@utility`.

## 4. Theming rules (specific to Skip-Bo)

These come from incidents that shipped to production. Don't relax them without understanding the why.

1. **Use `background-image:` — never the `background:` shorthand on body or anything that needs a stable `background-color`.** The shorthand resets `background-color` to transparent. iOS Safari samples the body's `background-color` when tinting the status bar; a transparent body falls back to white in light mode. This is what made Neon's status bar look wrong even though the meta `theme-color` was correct.

2. **Keep `--background` close to what's actually painted at the top of the page.** [`useThemeColorMeta`](../hooks/useThemeColorMeta.ts) writes `--background` into `<meta name="theme-color">`, and `bg-background` paints the body with it. A wildly off-base value makes the iOS bar mismatch the page.

3. **Multi-layer gradients must be comma-separated.** Browsers silently drop a `background-image` declaration whose layers are space-separated. `candy.css` and `retro-space.css` shipped broken halos for this reason.

4. **When overriding a multi-layer `background-image`, the matching `background-size` and `background-repeat` lists must have the same number of entries as the layers.** CSS cycles shorter lists, so a layer can silently inherit a tile size meant for another layer (Rainbow's lightning shipped with the sun glow tiling four times because of this).

## 5. Theme file template

```css
/* Optional shared utility imports (e.g., glass theme) */
/* @import './utils/liquid-glass.css'; */

.theme-<name> {
  /* === Core color scheme === */
  --background: ...;
  --foreground: ...;
  --primary: ...;        --primary-foreground: ...;
  --secondary: ...;      --secondary-foreground: ...;
  --success: ...;        --success-foreground: ...;
  --destructive: ...;    --destructive-foreground: ...;
  --muted: ...;          --muted-foreground: ...;
  --accent: ...;         --accent-foreground: ...;
  --popover: ...;        --popover-foreground: ...;
  --border: ...;
  --ring: ...;
  --text-color: ...;
  --title-color: ...;

  /* === Card surface === */
  --card-front-color: ...;
  --card-back-color: ...;
  --card-border-color: ...;
  --card-color: ...;
  --card-radius: ...;
  --card-shadow: ...;

  /* === Card number colors (1–4, 5–8, 9–12) === */
  --card-g1: ...;
  --card-g2: ...;
  --card-g3: ...;

  /* === Skip-Bo special card === */
  --skipbo-text: ...;
  --skipbo-bg: ...;

  /* === Selection & drag === */
  --selected-border-color: ...;
  --selected-shadow: ...;
  --drop-indicator-color: ...;
  --can-drop-shadow: ...;
  --active-turn-color: ...;

  /* === Victory layer (only what differs from :root defaults) === */
  --victory-border: ...;
  --victory-accent: ...;
  --victory-piece-1: ...;  /* ...etc */

  /* === Theme-internal tokens (private to this theme) === */
  /* Prefixed for clarity: --lg-* (glass), --crack-* (cracked glass),
     --retro-space-* (retro-space), etc. */

  /* === Body / page chrome === */
  & body {
    background-image: ...;
  }

  /* === Card customizations === */
  & .card { /* tweaks */ }
  & .card.skipbo-text { /* Skip-Bo */ }
  & .card.normal-card[data-value='N'] { /* per-value, e.g. metro.css */ }

  /* === Player / center area overrides === */
  & .player-area, & .center-area { ... }

  /* === Responsive overrides (use @variant <breakpoint>, not raw @media) === */
  & .player-area .discard-piles {
    @variant max-sm { ... }
  }
}

/* === Theme-local keyframes (top-level by CSS spec) === */
@keyframes <name>-foo { /* ... */ }
```

**Sections appear in this order.** Empty sections are removed (don't keep empty headers).

## 6. Token catalog

Tokens read by global code in `styles/*.css` are **universal**. Themes override them but don't invent new names for the same concept. Theme-only tokens get a prefix (`--lg-*`, `--retro-space-*`, etc.).

### Universal tokens

| Token                                                   | Type        | Default in `:root`                                    | Read by                                                        |
| ------------------------------------------------------- | ----------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| `--background`                                          | color       | `hsl(0 0% 100%)`                                      | `body`, `useThemeColorMeta` (writes into `<meta theme-color>`) |
| `--foreground`                                          | color       | `hsl(0 0% 3.9%)`                                      | base text                                                      |
| `--primary` / `--primary-foreground`                    | color       | `(undefined / undefined)`                             | Tailwind `bg-primary`, `text-primary-foreground`               |
| `--secondary` / `--secondary-foreground`                | color       | `(undefined)`                                         | `.player-area`, `.center-area`, Tailwind                       |
| `--success` / `--success-foreground`                    | color       | `hsl(142 72% 42%) / hsl(0 0% 98%)`                    | Tailwind                                                       |
| `--destructive` / `--destructive-foreground`            | color       | `hsl(0 84.2% 60.2%)`                                  | Tailwind                                                       |
| `--muted` / `--muted-foreground`                        | color       | `hsl(0 0% 96.1%) / hsl(0 0% 45.1%)`                   | Tailwind                                                       |
| `--accent` / `--accent-foreground`                      | color       | `hsl(0 0% 96.1%) / hsl(0 0% 9%)`                      | Tailwind                                                       |
| `--popover` / `--popover-foreground`                    | color       | `hsl(0 0% 100%) / hsl(0 0% 3.9%)`                     | Select dropdown                                                |
| `--border`                                              | color       | `hsl(0 0% 89.8%)`                                     | Tailwind `border-border`                                       |
| `--ring`                                                | color       | `hsl(0 0% 3.9%)`                                      | Tailwind focus ring                                            |
| `--input` / `--input-foreground`                        | color       | `var(--primary)`                                      | Form inputs                                                    |
| `--text-color`                                          | color       | _(theme-set)_                                         | `body`                                                         |
| `--title-color`                                         | color       | _(theme-set)_                                         | `h1`, `h2`                                                     |
| `--radius`                                              | length      | `0.5rem`                                              | Tailwind `rounded-*`                                           |
| `--card-width`                                          | length      | `46px` / `70px` ≥64rem                                | `.card`, card stacks                                           |
| `--card-height`                                         | length      | `66px` / `100px` ≥64rem                               | `.card`, `card-height` utility                                 |
| `--stack-diff`                                          | length      | `16px` / `20px` ≥64rem                                | discard pile stacking                                          |
| `--card-front-color`                                    | color       | `white`                                               | `.card` background                                             |
| `--card-back-color`                                     | color       | _(theme-set)_                                         | `.card-back` utility                                           |
| `--card-back-bg`                                        | bg-image    | _(optional override of `--card-back-color`)_          | `.card-back` utility                                           |
| `--card-border-color`                                   | color       | _(theme-set)_                                         | `.card`, `.placeholder`                                        |
| `--card-color`                                          | color       | _(theme-set)_                                         | `.card` text                                                   |
| `--card-radius`                                         | length      | _(theme-set)_                                         | `.card`, `.placeholder`, `.drop-indicator`                     |
| `--card-shadow`                                         | shadow      | _(theme-set)_                                         | `.card`, `.discard-pile-stack`                                 |
| `--skipbo-text` / `--skipbo-bg`                         | color       | `(undefined) / white`                                 | `.skipbo-text` utility                                         |
| `--card-g1` / `--card-g2` / `--card-g3`                 | color       | `#0f0 / #f00 / #f0f` (deliberately ugly to fail loud) | card values 1–4 / 5–8 / 9–12                                   |
| `--selected-border-color`                               | color       | `#f59e0b`                                             | `.card.selected`, `.drop-target-hover`                         |
| `--selected-shadow`                                     | shadow      | `0 0 20px var(--selected-border-color)`               | `.card.selected`                                               |
| `--drop-indicator-color`                                | color       | `var(--selected-border-color)`                        | `.drop-indicator`                                              |
| `--can-drop-shadow`                                     | shadow      | `0 0 15px var(--selected-border-color)`               | `.drop-indicator.can-drop`                                     |
| `--active-turn-color`                                   | color       | `var(--primary)`                                      | `.player-area.active-turn` ring                                |
| `--victory-border`                                      | color       | `#d8b657`                                             | `.player-area.winner`                                          |
| `--victory-accent` / `--victory-accent-soft`            | color       | _(derived)_                                           | `.victory-accent`                                              |
| `--victory-accent-opacity`                              | number      | `0`                                                   | `.victory-accent` opacity                                      |
| `--victory-pattern-image`                               | bg-image    | `none`                                                | `.victory-pattern`                                             |
| `--victory-pattern-opacity`                             | number      | `0`                                                   | `.victory-pattern`                                             |
| `--victory-pattern-size` / `--victory-pattern-drift-to` | length-pair | `48px 48px / 24px 24px`                               | `.victory-pattern`                                             |
| `--victory-pattern-animation`                           | animation   | `victoryPatternDrift 2s linear infinite`              | `.victory-pattern`                                             |
| `--victory-piece-1..4`                                  | color       | `#f59e0b / #ef4444 / #22c55e / #3b82f6`               | `.victory-burst-piece`                                         |
| `--victory-burst-size`                                  | length      | `11px`                                                | `.victory-burst-piece`                                         |
| `--victory-burst-distance-scale`                        | number      | `0.88` (desktop), `0.72` (mobile)                     | burst geometry                                                 |
| `--victory-shine-opacity` / `--victory-flyby-opacity`   | number      | `0`                                                   | optional victory layers                                        |

### Theme-internal tokens (private to one theme)

Each theme can declare additional tokens that are only read inside its own block. Keep a meaningful prefix.

| Prefix            | Owner                                                | Purpose                                    |
| ----------------- | ---------------------------------------------------- | ------------------------------------------ |
| `--lg-*`          | `themes/utils/liquid-glass.css`, used by `glass.css` | blur/rim/fill stops for the glass utility  |
| `--crack-*`       | `glass.css`                                          | cracked-glass overlay tuning on card backs |
| `--retro-space-*` | `retro-space.css`                                    | corner-number positioning, font sizing     |
| `--minecraft-*`   | `minecraft.css`                                      | dirt/grass texture tuning                  |
| `--rainbow-*`     | `rainbow.css`                                        | per-card-value rainbow stops               |
| `--steampunk-*`   | `steampunk.css`                                      | brass/copper accent stops                  |

## 7. Adding a new theme — checklist

1. Copy a similar theme as a starting template (e.g. `cp paper.css <name>.css`).
2. Set all required tokens in section order. **Minimum** required by `theme-contract.spec.ts`:
   - `--background`
   - `--foreground`
   - `--selected-border-color`
   - `--card-g1` (and conventionally `--card-g2`, `--card-g3` too)
3. Add the theme to [`packages/game-core/src/types/index.ts`](../../../../packages/game-core/src/types/index.ts) `themes` array: `{ value: 'theme-<name>' as const, label: '<Display Name>', icon: '<LucideIconName>' }`.
4. Add an `@import './themes/<name>.css';` line to [`index.css`](../index.css), alphabetical.
5. Run `pnpm --filter @skipbo/web exec playwright test tests/ui/theme-contract.spec.ts --project=chromium-desktop`. The first run generates the baseline PNG snapshot — commit it.
6. If the theme is one of the [`representativeThemes`](../../tests/ui/helpers.ts) used by `layout-and-accessibility.spec.ts`, also commit those snapshots.

## 8. Visual regression workflow

- Snapshot location: `apps/web/tests/ui/<spec>-snapshots/`.
- Update all baselines: `pnpm test:visual:update`.
- Update one spec: `pnpm --filter @skipbo/web exec playwright test <spec> --update-snapshots --project=chromium-desktop`.
- Always open the Playwright HTML report (`apps/web/playwright-report/index.html`) and inspect the diff PNG before accepting an updated baseline.

## 9. Adding a new utility — decision flow

- Used in ≥2 places **and** the name carries semantic meaning beyond the raw classes? → `@utility`. Place it in `styles/utilities.css` for project-wide, or in the matching domain file (`card.css`, `drag.css`, `victory.css`, `animations.css`).
- Used in one place? → leave inline. Don't extract.
- Sets a CSS variable value? → native CSS, not `@apply`.
- Composes a few Tailwind classes under a project-specific name? → `@apply` is fine.

## 10. Anti-patterns

These all have shown up in past incidents or get debated in review. Skip them.

- `@apply` setting `var(--foo)` (project convention, §3.2).
- One-off `@custom-variant` per component.
- Hardcoded color values in component JSX (`style={{ color: '#ff0' }}`) — always go through a CSS variable, even if it's defined only in `:root`.
- Duplicating an existing universal token under a new name in a theme file.
- `background:` shorthand on body or anywhere that needs a stable `background-color` (see §4.1).
- Splitting a theme into multiple sibling `.theme-<name> selector { ... }` rules instead of one nested block (see §3.4).
- Space-separated multi-layer gradients (see §4.3).

## 11. Tooling

- **`.editorconfig`** at the repo root locks `indent_size = 2` for everyone.
- **Prettier** (`.prettierrc.json`) formats `.ts`, `.tsx`, `.js`, `.json`, `.md`, `.css`, `.yml`. Run `pnpm format` (write) or `pnpm format:check` (CI).
- **`pnpm lint`** runs `format:check` before the ESLint chain, so a failed format will fail lint.
