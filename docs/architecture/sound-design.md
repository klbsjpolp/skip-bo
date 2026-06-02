# Sound Design

Status: **base system + `retro` reference theme implemented.** Remaining flavored
themes are specced here but not yet authored.

## Goals

- Add audio feedback for game events (card play, discard, draw, pile completion,
  victory, …).
- Make the **sound palette themeable**, mirroring the existing visual theme
  system, so each visual theme can have a matching sonic identity (chiptune,
  sci-fi, blocky, …).
- Zero audio asset files: every sound is **synthesized at runtime with the Web
  Audio API**. This keeps the bundle small and sidesteps sample licensing. The
  trade-off (see "Why synthesis") is accepted deliberately.

## Why synthesis (and why `retro` first)

Pure oscillators + envelopes are exactly how 8-bit consoles produced sound, so a
chiptune palette synthesizes _authentically_ rather than as a compromise. That
makes `retro` the simplest and safest first flavored theme: square/pulse/triangle
blips and arpeggiated fanfares are trivially convincing with the primitives we
already need for the engine. Sample-hungry palettes (realistic card foley for
`paper`, recognizable `minecraft` SFX) are the hardest to synthesize and are
deferred — they fall back to the neutral `base` theme until/unless authored.

## Architecture

Three layers, all under `apps/web/src/sound/`:

1. **Engine** (`engine.ts`) — owns a single lazy `AudioContext` and a master
   `GainNode`. Exposes `playRecipe(recipe)`, `setMuted`, `setVolume`, `resume`.
   Knows nothing about game events or themes. All synthesis primitives
   (oscillator voices, noise bursts, envelopes) live here.
2. **Theme registry** (`themes/`) — maps `(SoundThemeId, SoundEventId)` to a
   `SoundRecipe`. `base.ts` is authored in full; flavored themes override only
   the events they want to re-voice and inherit the rest from `base`.
3. **Controller** (`SoundController` React component + `playSound` facade) —
   resolves the active theme, applies user prefs (mute/volume), gates on the
   autoplay-unlock state, and is the single entry point the rest of the app
   calls: `playSound('build-snap')`.

```
game/animation code ──► playSound(eventId)
                           │  (facade, theme-agnostic)
                           ▼
                  resolve(themeId,eventId)──► SoundRecipe
                           │
                           ▼
                     engine.playRecipe ──► Web Audio graph
```

### The trigger seam: one universal funnel

Every card movement in the app — human or AI, local or online — is rendered by
`AnimatedCard` and begins its travel in a single place: `markAnimationStarted`
(`components/AnimatedCard.tsx`). Each animation already carries an
`animationType: 'play' | 'discard' | 'draw' | 'complete'` and the `card`. We map
that enum to a sound event there, which means **one hook point covers most of
the catalog in both local and online modes** without touching the game hooks,
the XState machine, or `game-core`.

Triggering at `markAnimationStarted` (after each animation's `initialDelay`)
rather than at dispatch time is important: staggered sequences (multi-card draws,
pile-completion retreats) fire their sounds spread out in time, matching the
visuals, instead of machine-gunning all at once.

Victory is the one event not represented by a card movement; it is triggered from
`VictoryEffects` mounting (which already only renders for the winner).

| Event id        | Trigger source                            | Notes                                  |
| --------------- | ----------------------------------------- | -------------------------------------- |
| `build-snap`    | `animationType: 'play'`                   | the workhorse sound                    |
| `skipbo-accent` | `animationType: 'play'` + `card.isSkipBo` | replaces `build-snap` for wildcards    |
| `discard`       | `animationType: 'discard'`                |                                        |
| `draw`          | `animationType: 'draw'`                   | pitch-jittered per card                |
| `pile-complete` | `animationType: 'complete'` (first card)  | reward chime; only once per completion |
| `victory`       | `VictoryEffects` mount                    | fanfare                                |
| `select`        | (reserved) `SELECT_CARD`                  | not wired yet — see "Deferred"         |

### Why not `game-core` or the reducer

`game-core` is pure (no UI/network deps, per its CLAUDE.md). Audio is a UI
concern, so all sound code lives in `apps/web`. Triggering off animations rather
than reducer actions also means online optimistic updates and server
reconciliation don't double-fire: the sound rides the _visual_ animation, of
which there is exactly one per card movement.

## Sound theme registry

`SoundThemeId` is **the same union as the visual `Theme`** (`theme-*`), plus a
synthetic `base`. Resolution is per-event with fallback:

```ts
resolve(themeId, eventId) = themes[themeId]?.[eventId] ?? base[eventId];
```

So authoring `theme-retro` means overriding only the handful of events that
should sound 8-bit; everything else inherits `base`. No theme needs all events.

### Coupling to the visual theme

**Decision: sound theme auto-follows the visual theme, no separate selector.**
The controller reads the active `next-themes` value at play time and resolves the
matching sound theme. Switching the visual theme instantly changes the sonic
palette with no extra wiring. A future decoupling override
(`soundThemeOverride: 'auto' | Theme`) can be added in `lobbyPreferences.ts`
without changing any trigger site — but is intentionally **not** built now (YAGNI).

## User preferences

Persisted in `lobbyPreferences.ts` (same localStorage pattern as player name):

- `skipbo_sound_enabled` — boolean. **Default: disabled.** A PWA should not blast
  audio on first load; the user opts in with one tap. (Guess — documented here as
  the chosen default; easy to flip later.)
- `skipbo_sound_volume` — 0..1 master volume. Default `0.6`. (Guess.)

UI lives next to `ThemeSwitcher` in the app toolbar (`App.tsx`): a mute/unmute
toggle button. A volume slider is deferred (toggle covers the 90% case; volume
default is sensible).

## Autoplay unlock

`AudioContext` starts `suspended` until a user gesture, especially on iOS Safari
(which this repo already babysits for status-bar theming). The controller calls
`engine.resume()` on the first pointer/key interaction (one-shot listener) and
also whenever the user toggles sound on. Sounds requested before unlock are
dropped silently rather than queued.

## Testing

Web Audio does not exist in jsdom, so unit tests target the **logic**, not audio
output:

- recipe resolution + per-event fallback to `base`
- preference persistence (enabled/volume round-trips through localStorage)
- the controller's gating (muted ⇒ engine not invoked; locked ⇒ not invoked)

The engine's actual synthesis is exercised behind an injectable audio backend so
tests can assert "playRecipe was called with recipe X" against a mock. Real sound
quality stays a manual check. No visual-regression or E2E impact is expected
(audio is invisible and off by default, so existing snapshots/flows are
unaffected).

## Theme palette plan

Each entry lists the _intended_ sonic identity and which events it should
override. Only `base` and `theme-retro` are implemented today.

| Theme               | Identity                   | Synthesis approach                                       | Status   |
| ------------------- | -------------------------- | -------------------------------------------------------- | -------- |
| `base`              | Neutral, soft, functional  | Sine/triangle blips, gentle filtered-noise snaps         | **done** |
| `theme-retro`       | 8-bit chiptune             | Square/pulse waves, arpeggio fanfare, bitcrushed noise   | **done** |
| `theme-retro-space` | Sci-fi / bleepy console    | Detuned saws, pitch sweeps, ring-mod accents             | planned  |
| `theme-neon`        | Synthwave                  | Saw + lowpass sweep, reverb-ish feedback delay           | planned  |
| `theme-minecraft`   | Blocky / wood-stone clicks | Short noise bursts w/ bandpass; hard to nail w/o samples | deferred |
| `theme-wool`        | Soft, muffled, cozy        | Lowpassed sines, very short envelopes                    | planned  |
| `theme-paper`       | Realistic card foley       | Filtered noise riffle — weakest fit for synthesis        | deferred |
| `theme-steampunk`   | Mechanical clicks, brass   | Metallic FM-ish tones, noisy clanks                      | planned  |
| `theme-candy`       | Bright, bubbly, playful    | High sines, pitch-bend "pops", xylophone fanfare         | planned  |
| `theme-glass`       | Crystalline                | High sine bells with long decay                          | planned  |
| `theme-origami`     | Light paper folds          | Soft noise flicks                                        | deferred |
| `theme-midnight`    | Calm, deep, minimal        | Low sines, sparse                                        | planned  |
| `theme-metro`       | Clean modern UI            | Crisp sine ticks, marimba-ish chime                      | planned  |
| `theme-rainbow`     | Cheerful, colorful         | Major-scale arpeggios across events                      | planned  |

"deferred" = sounds noticeably better with real samples; stays on `base` until
samples are introduced (which would extend the engine with a buffer-loading
backend — out of scope for this iteration).

## Adding a new sound theme

1. Create `apps/web/src/sound/themes/<name>.ts` exporting a
   `Partial<Record<SoundEventId, SoundRecipe>>`.
2. Register it in `themes/index.ts` keyed by its `theme-*` id.
3. Override only the events you want to re-voice; the rest inherit `base`.
4. Add a unit test asserting the override resolves and the unspecified events
   fall back to `base`.
