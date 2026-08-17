# Apple Design Audit

## Document Contract

- Purpose: audit the web app's interaction, motion, material and typography layers against the
  [apple-design](https://raw.githubusercontent.com/emilkowalski/skills/refs/heads/main/skills/apple-design/SKILL.md)
  rubric (distilled from Apple's WWDC design talks, chiefly _Designing Fluid Interfaces_ 2018),
  and record concrete, file-level follow-ups.
- Audience: contributors and agents working on `apps/web` UI, motion, or theming.
- Source of truth: none. This is a **non-normative** review note per
  [README.md](README.md). Where this file disagrees with code or with
  [apps/web/CLAUDE.md](../../apps/web/CLAUDE.md), the code and the stable docs win.
- When to update: when a finding is fixed, rejected, or graduates into a stable doc.
- Audited at: `apps/web/src` on branch `claude/apple-design-audit-cqn449`.

Findings are numbered `A1…A18` so they can be cited in issues and commits. Section references
(§1…§17) point at the skill rubric.

**Fixed alongside this note:** A1, A2, A7.2, A7.3 and A17 — the subset that is CSS-only, changes no
input behaviour and no duration the state machine reads, and provably moves no visual baseline
(`stable-screenshot.css` disables transitions and animations wholesale, Playwright sets no
`reducedMotion`, and screenshots never press or keyboard-focus a card). Each carries a **Status**
line below. Everything else is still open.

---

## Summary

The gesture layer is unusually well engineered for _correctness_ — pointer capture, per-pointer-type
hysteresis, touch drop tolerance, single-gesture guards, cancel-on-blur, and a rect-based drop
resolver that is unit-testable. Almost every hard-won iPadOS lesson is captured in code and
commented. That is the "safety/predictability" half of the rubric, and it is in good shape.

What is missing is the _physical_ half. The app has no concept of **velocity**, **springs**, or
**interruption**. Every motion in the app is a fixed-duration ease curve, chosen by distance, that
runs to completion with input locked out. Against the rubric's through-line — _motion starts from
the current on-screen value, inherits the user's velocity, projects momentum forward, and can be
grabbed and reversed at any instant_ — the app currently satisfies none of the four clauses.

Second theme: **press feedback does not exist**. Cards respond to `:hover`, which no touch device
has. Sixteen of seventeen themes have no `:active` state at all.

Third theme: **the reduced-motion discipline is real but applied to the wrong layer.** Themes
silence their decorative ambience carefully; the core interaction layer — card flights, drop
indicators, popovers — ignores every accessibility media query.

| Rubric area                       | State                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------- |
| §1 Response                       | ◐ press feedback added (A1); render-blocking font imports remain                |
| §2 Direct manipulation            | ◐ 1:1 tracking is correct; grab offset deliberately discarded (see A3)          |
| §3 Interruptibility               | ✗ input hard-locked during every animation                                      |
| §4 Springs / behavior             | ✗ no springs anywhere                                                           |
| §5 Velocity handoff               | ✗ velocity never measured                                                       |
| §6 Momentum projection            | ✗ not implemented                                                               |
| §7 Spatial consistency            | ✓ flights start and land on real element rects; release-point override is right |
| §8 Directional hinting            | ✗ targets light up statically                                                   |
| §9 Rubber-banding                 | ✗ hard rect test                                                                |
| §10 Gesture feel checklist        | ✓ hysteresis, hit tolerance, and press-on-down feedback all present             |
| §11 Frame-level smoothness        | ◐ `will-change` applied backwards; `filter:` on every in-flight card            |
| §12 Materials & depth             | ◐ blur used, but light-on-light stacking in dialogs                             |
| §13 Multimodal feedback           | ✗ no sound, no haptics                                                          |
| §14 Reduced motion / transparency | ◐ indicators, popovers, transparency, contrast done; card flights still exempt  |
| §15 Typography                    | ✗ size-agnostic tracking; the declared body font is never loaded                |
| §16 Foundations                   | ✓ strong — wayfinding, mapping, and labelling are good                          |

---

## High severity

### A1 — Nothing responds to a press (§1, §10)

`.hoverable-card:hover` ([card.css:18-23](../../apps/web/src/styles/card.css)) is the app's only
card feedback. Hover does not exist on touch, so on an iPad **a tap on a card produces no feedback
at all** until the selection state renders after the click handler resolves. The rubric's first
rule — highlight on pointer-_down_, commit on pointer-_up_ — is unimplemented.

The single counterexample is Metro, which does it correctly
([metro.css:219-222](../../apps/web/src/themes/metro.css), a tile-tilt on `:active` over a
`transform 0.15s ease-out` base). That rule is the right shape and belongs in `styles/card.css` as a
base treatment every theme inherits.

> **Fix.** Add `.card.hoverable-card:active { --card-scale: 0.97; }` to the base card layer. `:active`
> fires on pointer-down for touch and mouse alike, so this is a two-line change that closes the
> largest single gap in the audit. Because `useDraggableCard` calls `preventDefault()` on mouse
> pointerdown ([useDraggableCard.ts:70-72](../../apps/web/src/hooks/useDraggableCard.ts)), verify
> `:active` still latches on desktop; if not, set a `data-pressed` attribute in the same handler and
> style that instead.

**Status: fixed.** Shipped as a `--card-press` multiplier folded into `.card`'s transform rather than
a `--card-scale` override, so it composes with every scale already in play — the fanned hand's 1.08
hover, a theme's own — instead of fighting them on specificity. A theme that replaces `transform`
outright on `:active`, as Metro does, keeps its own treatment untouched.

### A2 — The hover lift animates in and snaps out (§7, §16 craft)

[card.css:18](../../apps/web/src/styles/card.css) declares the transition _inside_ the `:hover`
block. Transitions are read from the after-change style, so hover-in interpolates and hover-out has
no `transition-property` to run — the card drops instantly. The rubric's reversible-transition rule
(§7: mirror the path) is broken in the most visible place in the app.

`.card.selected` ([card.css:64-68](../../apps/web/src/styles/card.css), `--card-translate-y: -5px`)
has no transition at all. It only appears to animate inside the fanned hand, because
[layout.css:55-58](../../apps/web/src/styles/layout.css) happens to declare
`transition-property: left, top, transform` on `.overlap-hand .card`. Selecting a stock, discard, or
build-pile card is a hard jump.

> **Fix.** Move `transition: transform 200ms, box-shadow 200ms` onto the base `.card` rule and delete
> it from `:hover`. This makes selection and hover symmetric everywhere and lets `.overlap-hand`'s
> rule keep only the `left`/`top` part it actually needs. Run `test:visual` — this touches every
> theme's card.

**Status: fixed**, scoped to `transform` and `box-shadow` exactly. `transition-all` on the base rule
would also animate `top`/`left`, which carry the discard-stack and hand-slot geometry — a card would
slide between stack positions instead of snapping.

### A3 — The drag ghost snaps to the pointer centre, discarding the grab offset (§2)

[DragGhost.tsx:19](../../apps/web/src/components/DragGhost.tsx) renders the card at
`translate3d(pointer) translate(-50%, -50%)`, so grabbing a card by its corner instantly recentres it
under the finger. §2 calls this out by name: _"Snapping to the element's center on grab breaks the
illusion immediately."_

**This is a documented, deliberate decision, not an oversight.** Both
[dragTargeting.ts:5-11](../../apps/web/src/game/dragTargeting.ts) and
[apps/web/CLAUDE.md](../../apps/web/CLAUDE.md#drag-and-drop-pointer--touch) state the rationale: an
offset ghost shows the card somewhere other than where it will land, and players aim at the card
they see. That reasoning is sound and it defeats the naive fix.

The two positions are reconcilable, because the repo's rule is really about the **drop point**, not
about the offset:

> **Fix.** Capture `grabOffset = pointer − cardRect.center` at pointerdown, render the ghost at
> `pointer + grabOffset`, and pass `pointer + grabOffset` — the ghost's centre, not the raw pointer —
> into `resolveDropTarget`. The card then stays glued to the finger exactly where it was grabbed
> _and_ still lands where it is drawn. The stated invariant ("the card is what you aim") is preserved;
> only the definition of the aiming point moves from the pointer to the card centre. Worth
> prototyping before committing: it changes the effective touch target by up to half a card.

### A4 — Velocity is never measured, so a flick and a slow drag are identical (§5, §6)

`useDraggableCard` keeps only the latest point (`lastX`/`lastY`,
[useDraggableCard.ts:130-131](../../apps/web/src/hooks/useDraggableCard.ts)). There is no
position/timestamp history, no release velocity, and no momentum projection. Consequences:

- A confident flick toward a build pile that stops 30 px short of the tolerance does nothing.
- Release velocity is discarded, so the flight that follows starts from rest (see A5).
- There is no way to implement §6's "project where the gesture is _going_", which is what makes a
  flick feel like a throw rather than a carry.

> **Fix.** Keep a 4-6 sample ring buffer of `{x, y, t}` in `onMove`. On `onUp`, compute px/s over the
> last ~50 ms, project the endpoint with the rubric's exponential-decay function
> (`current + (v/1000)·d/(1−d)`, `d ≈ 0.998`), and resolve the drop target from the **projected**
> point rather than the release point. This composes cleanly with the existing design: `resolveTarget`
> already takes an arbitrary `(x, y)`, so this is a change at one call site
> ([useDraggableCard.ts:195](../../apps/web/src/hooks/useDraggableCard.ts)) plus a pure helper that
> belongs in `dragTargeting.ts` next to its neighbours, where it is unit-testable.

### A5 — Card flights are fixed-duration Material curves, and there is a visible seam at release (§4, §5)

Flight duration is distance ÷ 0.5 px/ms clamped to 300-800 ms
([cardPositions.ts:128-136](../../apps/web/src/utils/cardPositions.ts)), played on
`cubic-bezier(0.4, 0.0, 0.2, 1)` — Material Design's standard easing —
([AnimatedCard.tsx:109](../../apps/web/src/components/AnimatedCard.tsx)). Every motion in the app is
prescribed rather than behavioural.

The seam is concrete and specific. `useDraggableCard` correctly starts the flight from the release
point via `setDragCommitOverride`
([useDraggableCard.ts:201-203](../../apps/web/src/hooks/useDraggableCard.ts)) — spatially this is
exactly right and it is the app's best §7 detail. But the curve it hands off to is `ease-in-out`:
the animation **decelerates from zero** at the very instant the finger was moving fastest. The card
stops dead under the finger, then restarts. This is precisely the "seam between drag and animation"
§5 exists to eliminate.

> **Fix.** Replace the WAAPI keyframe pair in `AnimatedCard` with a spring. Default `bounce: 0`
> (critically damped, `duration ≈ 0.4`) for AI/system moves; for a human-released drag, pass the A4
> release velocity as the spring's initial velocity and allow `bounce ≈ 0.2` — the rubric's rule that
> overshoot is earned by momentum, never granted by default. `CardAnimationData.duration` is load-bearing
> for the state machine (`animationGate` awaits it), so a spring needs to report a settle estimate; the
> cleanest path is to keep `duration` as the gate's budget and let the spring finish inside it.

### A6 — Input is hard-locked during animation, and the lock has an artificial floor (§3)

§3 calls interruptibility _"the single most important principle"_ and _"never lock out input during
a transition"_. The app does the opposite by design:

- `interactionLockRef` gates `selectCard`, `playCard`, `discardCard` and `endTurn`
  ([useSkipBoGame.ts:39-156](../../apps/web/src/hooks/useSkipBoGame.ts)), and `useDraggableCard`
  refuses to even begin a gesture while it is set
  ([useDraggableCard.ts:67](../../apps/web/src/hooks/useDraggableCard.ts)).
- `animationGate` awaits `Promise.all([animations, timeoutPromise])`
  ([animationGate.ts:9-21](../../apps/web/src/services/animationGate.ts)) — so a fast animation is
  still held for a **minimum** display time. That is a deliberate artificial latency on the input
  path, which §1 asks you to audit for.
- Nothing in flight is grabbable. An in-flight card is a `pointer-events: none` element in a
  `pointer-events: none` layer ([card.css:84](../../apps/web/src/styles/card.css),
  [animations.css:9-11](../../apps/web/src/styles/animations.css)).

Some of this is a genuine constraint rather than a defect: this is a turn-based card game where the
lock also protects the reducer from double-commits and the online path from racing an authoritative
view. Full mid-flight reversal is not a sensible goal here.

> **Fix (scoped).** Do not attempt grab-the-flying-card. Two narrower wins are available:
>
> 1. Allow **selection** while an opponent's animation plays — reading the board and picking your
>    next card is not a state mutation that can race, and it is the interaction most often blocked.
> 2. Drop the minimum-display floor in `animationGate` (keep it as a fallback timeout only, i.e.
>    `Promise.race` for the timeout as a safety net rather than `Promise.all` as a floor). If a
>    motion finishes early, holding the board for the remainder is latency the player feels and
>    cannot explain.

### A7 — The interaction layer ignores every accessibility media query (§14)

Reduced-motion handling in this repo is genuinely careful — but it is applied entirely to
_decorative_ motion (victory effects, theme ambience: `victory.css`, `cinema.css`, `minecraft.css`,
`rainbow.css`, `retro-space.css`, and the `.victory-flyby-layer` / `.victory-shine` defaults in
[base.css:125-137](../../apps/web/src/styles/base.css)). The interaction layer has none:

- **Card flights.** `AnimatedCard` calls `el.animate(...)` unconditionally
  ([AnimatedCard.tsx:104-113](../../apps/web/src/components/AnimatedCard.tsx)). Every play, discard,
  draw and pile-completion travels the full board under reduced motion.
- **Drop indicators.** `animate-bounce` and `animate-pulse`
  ([drag.css:15, 19, 29, 70, 81](../../apps/web/src/styles/drag.css)) are infinite Tailwind keyframe
  loops with no `motion-reduce` variant. Note that `animate-pulse` is a 2 s cycle ≈ 0.5 Hz, running
  simultaneously on _every_ valid target for the whole duration of a drag — close to the slow-
  oscillation pattern §14 warns about, multiplied across up to eight piles.
- **Popovers.** `popper-animations` ([animations.css:37-56](../../apps/web/src/styles/animations.css))
  animates unconditionally.

Only two spots in the interaction layer get it right —
[utilities.css:39](../../apps/web/src/styles/utilities.css) (key-hint fade) and
[StockPile.tsx:116](../../apps/web/src/components/player-area/StockPile.tsx) (progress bar).

Also absent repo-wide: `prefers-reduced-transparency` and `prefers-contrast`. Nothing in `src/`
matches either query, while glass ([glass.css:77, 194](../../apps/web/src/themes/glass.css)), candy
([candy.css:102](../../apps/web/src/themes/candy.css)), origami
([origami.css:95](../../apps/web/src/themes/origami.css)), the dialog overlay
([dialog.tsx:18](../../apps/web/src/components/ui/dialog.tsx)) and
[ForcedUpdateOverlay.tsx:20](../../apps/web/src/components/ForcedUpdateOverlay.tsx) all depend on
`backdrop-filter`.

> **Fix.** Three separable pieces:
>
> 1. Read `matchMedia('(prefers-reduced-motion: reduce)')` in `AnimatedCard` and collapse the travel
>    to a short opacity cross-fade at the destination — the card still communicates _what moved
>    where_, without the vestibular cost. Keep the duration contract intact so the gate is unaffected.
> 2. Add `motion-reduce:animate-none` to the four `animate-*` uses in `drag.css` and to
>    `popper-animations`. The static ring and lift already carry the meaning; only the loop is lost.
> 3. Add a `@media (prefers-reduced-transparency: reduce)` block that raises the translucent
>    surfaces to solid and drops the blur, and a `prefers-contrast: more` block that gives them a
>    defined border. One block in `base.css` targeting the shared surface tokens covers most of it.

**Status: (2) and (3) fixed; (1) still open** — the card flights need A5's animation path first.

Two things about (3) came out differently from the sketch above. There is no shared surface token to
target, so the dialog and the forced-update overlay now carry `.translucent-scrim` /
`.translucent-surface` marker classes and a future panel opts in by adding one. And the blur is
dropped with a universal selector rather than per surface: sixteen themes reach for `backdrop-filter`
independently, and a seventeenth must not be able to miss the preference silently. Board decoration —
a theme's tinted play area — keeps its translucent wash and loses only the blur; it carries no text
of its own.

The block is deliberately **unlayered**. These surfaces are painted by Tailwind utilities
(`bg-background/60`, `backdrop-blur-xs`) in the `utilities` layer, which an `@layer base` rule can
never outrank — `drag.css` uses the same escape hatch for the same reason.

One trap worth recording: writing `backdrop-filter` and `-webkit-backdrop-filter` by hand makes
Lightning CSS collapse the pair down to the **prefixed one only**, silently exempting every
non-WebKit browser. Write the standard property alone and let the build prefix it.

---

## Medium severity

### A8 — Ghost position is routed through React state (§1, §11)

`updateDrag` calls `setSession` on **every** `pointermove`
([DragContext.tsx:23-25](../../apps/web/src/contexts/DragContext.tsx)), re-rendering the provider
subtree and `DragGhost` per pointer event. High-rate pointers (120 Hz iPad) will deliver more moves
than frames, and the ghost's position — the single most latency-sensitive value in the app — pays
React's reconciliation cost on each one.

> **Fix.** Split the session into "discrete" state (card, valid targets, hovered target — React) and
> "continuous" state (pointer position — a ref plus a direct `element.style.transform` write inside
> a `requestAnimationFrame`). The ghost already sets `willChange: 'transform'`
> ([DragGhost.tsx:22](../../apps/web/src/components/DragGhost.tsx)), which is exactly right; this
> change lets it pay off.

### A9 — No rubber-banding at boundaries (§9)

Drop resolution is a hard predicate — inside the rect, or within `TOUCH_DROP_TOLERANCE_PX` of it, or
nothing ([dragTargeting.ts:80-105](../../apps/web/src/game/dragTargeting.ts)). Dragging a card to an
illegal pile, or past the edge of the board, produces no resistance and no signal; the card just
keeps following the finger and the release silently does nothing. §9's point is that continuous
resistance reads as _"responsive, but there's nothing here"_ where a hard nothing reads as broken.

> **Fix.** Cheapest meaningful version: as the ghost enters the tolerance ring of a valid pile, ease
> it a few px toward the pile centre (a magnet, the inverse of rubber-banding) so the near-miss is
> visible before release rather than discovered after. Full rubber-banding at the viewport edge is
> lower value here because `dragAutoScroll` already owns that region.

### A10 — Valid targets light up statically; nothing hints at direction (§8)

While a drag is active every legal pile gets the same treatment
([drag.css:25-32](../../apps/web/src/styles/drag.css)) — identical for a pile 10 px from the card and
one across the board. §8 asks for intermediate motion that telegraphs the outcome ("grow up and out
toward your finger").

> **Fix.** Scale the indicator's intensity by proximity: interpolate the lift/glow from the same
> `distanceToBounds` the resolver already computes. The nearest target visibly leads, which also
> pre-answers "will this land?" before release — reinforcing A9.

### A11 — No sound, no haptics anywhere (§13)

`navigator.vibrate`, `new Audio` and `AudioContext` appear nowhere in `src/`. A completed build pile,
an illegal drop, and winning the game are all silent and inert. §13's utility rule argues _against_
blanket feedback, so the recommendation is narrow.

> **Fix.** Three moments earn it: pile completion (success), drop on an invalid target (warning),
> victory (completion). Vibration API only, ~10-20 ms, fired on the same frame as the visual — and
> gated behind a user preference, since a card game is frequently played in quiet contexts.

### A12 — The declared body font is never loaded (§15, §16 craft)

[base.css:110](../../apps/web/src/styles/base.css) sets `font-family: 'Inter', sans-serif`, but
[index.css:14-20](../../apps/web/src/index.css) imports Cinzel, Quicksand, Nunito Sans, Caveat,
Kalam, Shippori Mincho, Titillium Web and Baloo 2 — **not Inter**. Unless Inter is installed locally,
every board falls through to the generic `sans-serif` keyword, which resolves to the browser default
(Times-adjacent on some configurations), not to the platform UI font.

This is both a bug and a §15 opportunity: the rubric's advice is to default to the platform system
font, which already ships optical sizing and tracking tables.

> **Fix.** `font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`. Themes that want
> a specific face already override it — 28 `font-family` declarations across `themes/*.css` — so this
> only changes the default board, and it changes it from "unspecified fallback" to "the user's
> platform font". Regenerate visual baselines.

### A13 — Seven render-blocking cross-origin font imports (§1)

[index.css:14-20](../../apps/web/src/index.css) opens with seven
`@import url('https://fonts.googleapis.com/...')` statements. CSS `@import` of a cross-origin
stylesheet serializes: the app's entire stylesheet — and therefore first paint — waits on Google
Fonts, over two round trips (the CSS, then the font files). Only one theme's font is ever needed in a
given session; the other six are pure cost.

> **Fix.** Move to `<link rel="preconnect">` plus per-theme lazy injection (load the face when the
> theme is selected), or self-host the subsets. §1's instruction is to be vigilant about _every_
> latency on the path; this is the largest one that is not gameplay.

### A14 — `will-change` is applied inversely to its purpose (§11)

- `.card` declares `will-change-auto` ([card.css:34](../../apps/web/src/styles/card.css)) — that is
  Tailwind for `will-change: auto`, the initial value. It does nothing.
- `.card-inner`, `.card-inner-2` **and their direct children** declare permanent
  `will-change: transform` ([card.css:57-61](../../apps/web/src/styles/card.css)) — two-plus
  permanently promoted compositor layers on every card on the board (a full board is 30+ cards), for
  elements that are static the overwhelming majority of the time.
- `.animated-card` — the one element that _is_ always moving — declares `will-change-auto`
  ([card.css:84](../../apps/web/src/styles/card.css)).

`DragGhost` is the only place that gets it right
([DragGhost.tsx:22](../../apps/web/src/components/DragGhost.tsx)).

> **Fix.** Drop `will-change` from `.card-inner*`, and put `will-change: transform` on
> `.animated-card` where motion actually is imminent. Measure before/after — the promoted layers may
> be masking a paint cost that then needs its own fix.

### A15 — Every in-flight card is put behind a `filter` (§11)

The four `.animation-*` classes apply `filter: brightness()/saturate()`
([animations.css:13-31](../../apps/web/src/styles/animations.css)), which forces the browser to
flatten and re-rasterize the card's whole subtree every frame. §11 asks for `transform`/`opacity`
only. This is not speculative in this codebase: `AnimatedCard` carries two long comments describing
real bugs caused by exactly this filter — the broken 3D flip
([AnimatedCard.tsx:115-119, 186-192](../../apps/web/src/components/AnimatedCard.tsx)) — and Metro
already force-disables it (`filter-none!`,
[metro.css:229-231](../../apps/web/src/themes/metro.css)).

> **Fix.** Express the tint as an `opacity`-blended overlay layer inside the card instead of a
> `filter` on it. That also removes the flip workaround's reason to exist.

### A16 — Light translucency stacked on light translucency (§12)

The dialog renders `bg-background/80` content
([dialog.tsx:36](../../apps/web/src/components/ui/dialog.tsx)) on top of a `bg-background/60
backdrop-blur-xs` overlay ([dialog.tsx:18](../../apps/web/src/components/ui/dialog.tsx)). §12 states
this case explicitly: _"Never stack a light translucent surface on another — legibility collapses."_
The content surface also carries no blur of its own, so board cards read straight through the dialog
body.

> **Fix.** Make the content surface materially heavier than the scrim it sits on: opaque or
> near-opaque background, and give it the blur (`backdrop-blur-lg`) rather than the overlay — §12's
> "bigger surfaces read as thicker". The overlay's job is to dim and push back, not to be the
> material.

---

## Low severity / notes

### A17 — Cards are focusable but have no designed focus state (§14, §16)

`Card` sets `role="button"` and `tabIndex={0}` when interactive
([Card.tsx:133-139](../../apps/web/src/components/Card.tsx)), but no `:focus-visible` treatment
exists anywhere in `styles/*.css`. Keyboard players get the UA default ring over 17 themes with
wildly varying card surfaces — while the app otherwise treats keyboard players as first-class
(`BoardKeyboardProvider`, positional bindings, hint badges). A themed focus ring reusing
`--selected-border-color` would close the gap in one rule.

**Status: fixed**, minus one theme surface. Cards are focusable via `role="button"` + `tabIndex`, so
the ring is on `.card:focus-visible` using `--selected-border-color`. The `.placeholder` empty-slot
affordance is still bare.

### A18 — The AI pacing delays are correct; leave them

`beforeMove: 300`, `afterCardSelection: 400` ([aiConfig.ts:84-87](../../apps/web/src/ai/aiConfig.ts))
are legibility pacing on the **opponent's** turn, not latency on the player's input path. §1's
"be vigilant about every latency" targets the input path. These are the right kind of deliberate
timing and should not be swept up in an A6 fix.

---

## What is already right

Worth recording so a future change does not regress it:

- **Spatial consistency (§7).** Flights start and land on real element rects
  (`cardPositions.ts`), including rotation compensation for the fanned hand's ±8° extremity cards.
  The `setDragCommitOverride` release-point handoff
  ([useDraggableCard.ts:201](../../apps/web/src/hooks/useDraggableCard.ts)) is the correct instinct —
  it just needs A5's spring to pay off fully.
- **Gesture hygiene (§10).** Per-pointer-type thresholds (5 px cursor / 8 px finger) and a 28 px
  touch drop tolerance ([dragTargeting.ts:19-35](../../apps/web/src/game/dragTargeting.ts)) are
  exactly §10's hysteresis-and-hit-padding rule, derived from real device behaviour rather than
  guessed.
- **Agency and forgiveness (§16.2).** A drag released in mid-air leaves the card selected rather
  than losing the move; Escape and window-blur abort cleanly
  ([useDraggableCard.ts:214-231](../../apps/web/src/hooks/useDraggableCard.ts)); keyboard discards
  arm and wait for Space because they are irreversible.
- **Mapping and grouping (§16).** `resolvePileIntent` gives every input method one shared meaning
  for "pressing a pile", and the keyboard layer is positional — the key pattern mirrors the screen
  layout, and badge legends come from `navigator.keyboard.getLayoutMap()` so an AZERTY player sees
  their own keys. That is §16's "arrange controls to mirror what they change", done well.
- **Craft in the small.** The Skip-Bo morph's `flushSync` face-swap at 90°
  ([AnimatedCard.tsx:131-147](../../apps/web/src/components/AnimatedCard.tsx)) exists because someone
  noticed three or four wrong frames. That is the §16.7 standard.

---

## Suggested order

Roughly by value ÷ risk. ~~A1, A2, A7.2, A7.3, A17~~ are done; what remains:

1. **A12** load a font that exists — one line, currently a real bug. Needs `pnpm test:visual:update`
   on macOS, since it changes the resting look of every default board.
2. **A14 / A15** `will-change` and `filter` — measure first. A14 looks free and is not:
   `will-change: transform` creates a stacking context _and_ a containing block, so removing it from
   `.card-inner*` can silently retarget theme layering.
3. **A4 → A5** velocity tracking, then springs with handoff. The big one; do it as one arc, since
   velocity without a spring to receive it has nowhere to go.
4. **A7.1** reduced-motion card flights — depends on A5's animation path.
5. **A8** ghost off the React render path.
6. **A6** narrow the interaction lock.
7. **A3** grab offset — prototype first; it contradicts a documented decision and deserves a real test.
8. **A16, A9, A10, A11, A13** — polish.

Any of these that touch card geometry, theme surfaces, or `.player-area` / `.center-area` require
`pnpm test:visual` for both projects and refreshed baselines per
[AGENTS.md](../../AGENTS.md#mandatory-validations).
