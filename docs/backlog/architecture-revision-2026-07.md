# Architecture Revision — July 2026

## Document Contract

- Purpose: record a whole-of-game architectural review — what holds up, where the structure is under strain, and a phased revision plan.
- Audience: contributors and agents planning structural refactors of the game runtime.
- Source of truth: none for runtime behavior — this is a non-normative proposal. Current behavior lives in the code files cited below and in [../architecture/source-of-truth.md](../architecture/source-of-truth.md).
- When to update: when a phase below is completed (strike it through and link the change), abandoned, or graduated into `docs/architecture/*`.

## Scope And Method

Reviewed the three game layers this repo owns — `packages/game-core`,
`packages/skipbo-runtime`, `apps/web` — against the stable docs
([online-multiplayer.md](../architecture/online-multiplayer.md),
[runtime-invariants.md](../architecture/runtime-invariants.md),
[decision-log.md](../architecture/decision-log.md)). The relay server and
protocol live in realtime-infra and are out of scope. Nothing here proposes
changing the decided authority model (D-007), the snapshot-sync model (D-003),
or the offline-first shell (D-001).

## What Holds Up — Keep As Is

- **Layering.** `game-core` (pure rules, Immer reducer, no UI/network) →
  `skipbo-runtime` (host authority + redaction) → `apps/web` (presentation,
  transport adapter). The D-007 migration executed this cleanly; the server
  really is game-agnostic and `skipbo-runtime` never ships secrets
  (`views.ts` redaction, viewer-relative rotation).
- **`SkipboHost` as a boundary.** `hostRuntime.ts` is small, framework-free,
  snapshot-in/snapshot-out, and fully unit-testable. It is the model the rest
  of the revision should converge toward.
- **Single online rendering path.** Host and guest both flow through
  `ingestView`; optimistic updates reconcile against one authoritative echo
  per move. The invariants around stale echoes are subtle but documented and
  tested.
- **Docs discipline.** Source-of-truth map, invariants, decision log, and the
  change matrix in `AGENTS.md` are current and match the code.
- **Test pyramid.** Rules in `packages/game-core/tests`, authority/redaction in
  `packages/skipbo-runtime/tests`, orchestration in `apps/web/src/**/__tests__`,
  board behavior in Playwright.

## Findings

Ordered by how much accumulated risk each one carries, not by effort.

### F-1: Two parallel orchestration stacks duplicate the move pipeline

Local play runs `gameMachine.ts` (XState) dispatching reducer actions; online
play runs view ingestion + optimistic updates in `useOnlineSkipBoGame`. Both
re-implement the same client-side move pipeline:

- `willPlayCardEmptyHand` exists three times, character-for-character:
  `apps/web/src/state/gameMachine.ts:16`, `apps/web/src/hooks/useSkipBoGame.ts:31`,
  `apps/web/src/hooks/useOnlineSkipBoGame/helpers.ts:65`.
- Pre-dispatch play/discard validation and its French error strings exist four
  times: `useSkipBoGame.playCard/discardCard`, `useOnlineSkipBoGame.playCard/discardCard`,
  `gameReducer.ts` (`MESSAGES`), and `skipbo-runtime/src/gameLogic.ts`
  (`validateOnlineAction`). The wordings have already drifted
  (`'Vous ne pouvez pas jouer cette carte'` vs `'… cette carte ici'`).
- The play/refill animation plan (play → pile completion → hand refill,
  chained by base delays) is computed independently in `gameMachine.ts`
  (`botService`), `useSkipBoGame.playCard`, and
  `useOnlineSkipBoGame/localActionAnimations.ts`.

Any rule change (e.g. a new source of playable cards) currently needs four
synchronized edits, and only some of them are covered by tests that would
catch the drift.

**Revision.** Extract a shared client-side *move intent* module (proposed:
`apps/web/src/game/moveIntents.ts`, or `game-core` for the pure parts):
`prepareMoveIntent(state, action)` returns `{ valid, error?, willEmptyHand,
refillPlan, completedBuildPileCards }`. Both hooks and the machine's
`botService` consume it. `willPlayCardEmptyHand` and the refill plan are pure
state functions and belong in `game-core` next to `planHandRefill`.

### F-2: Presentation concerns leak into the domain layer

Two leaks, both in `game-core`:

- **User-facing French strings are computed inside the reducer**
  (`gameReducer.ts` via `MESSAGES` in `lib/config.ts`) and stored in
  `GameState.message`. The invariants doc already flags this as an
  implementation detail, but it has architectural cost: the string is part of
  every snapshot and every redacted `ClientGameView`, i18n is impossible
  without touching the rules package, and hooks invent their own copies of the
  same strings (F-1).
- **`animationDuration` rides on `GameAction`** (dispatched in
  `useSkipBoGame.ts:278-282,382` and stored via `applyAndStoreAnimation` in
  `gameMachine.ts`). A rules action type carries a rendering hint; the machine
  needs four near-identical `assign` actions and `as unknown as` casts to
  shuttle it.

**Revision.** Replace `GameState.message` with a message *code* +
interpolation params (e.g. `{ code: 'GAME_WON', player: 1 }`); render text in
the web layer. Move `animationDuration` out of `GameAction` into the machine
event envelope (XState events can extend the action type in the web layer:
`type LocalEvent = GameAction & { animationDuration?: number }`), so
`game-core` stays presentation-free. Both are behavior-preserving for players;
the message change also shrinks the wire views.

### F-3: The turn machine's actors are DOM- and debug-coupled

`gameMachine.ts` is nominally the "local turn orchestration" owner, but its
actors reach sideways:

- `botService` and `drawService` call `triggerAIAnimation`,
  `triggerMultipleDrawAnimations`, `triggerCompletedBuildPileAnimation`, and
  `animationServiceBridge.waitForAnimations()` directly — the state machine
  cannot be exercised without the animation singletons stubbed.
- `drawService` parses `window.location.search` for the `aiHand` debug
  override (`gameMachine.ts:424-459`) — ~35 lines of URL parsing inside the
  turn engine.

**Revision.** Give the machine an injected *presentation driver* interface
(`{ animateBotMove, animateDraws, animateCompletion, waitForAnimations }`)
supplied as machine `input`, with the current services as the production
implementation and a no-op driver in tests. Move the `aiHand` parsing into a
small `debugOverrides.ts` consulted by the driver setup, not the machine.

### F-4: Animation services are wired through mutable module globals

`setGlobalAnimationContext`, `setGlobalDrawAnimationContext`, and
`setGlobalCompletedPileAnimationContext` are module-level mutable slots, set
from `useEffect` in *both* `useSkipBoGame.ts:55-59` and
`useOnlineSkipBoGame.ts:364-368`. Whichever game screen mounted last owns the
globals; the services silently no-op (or worse, animate a stale context) if
called before a hook has run. This is the root reason the machine actors
(F-3) can call animation functions "from anywhere".

**Revision.** Fold the three contexts into one `AnimationDriver` object owned
by `CardAnimationContext` and passed explicitly (to the machine via F-3's
driver input; to online ingestion via a parameter on `ingestView`'s
collaborators). Delete the `setGlobal*` setters once no caller remains.

### F-5: `useOnlineSkipBoGame` is a god hook with a ref-plumbing seam

The online client is 669 lines (`useOnlineSkipBoGame.ts`) + 435
(`useOnlineConnection.ts`) + 238 (`helpers.ts`) + `localActionAnimations.ts`.
The split with `useOnlineConnection` is not an interface: the connection hook
receives **8 shared mutable refs and 15 callbacks** (its
`UseOnlineConnectionParams`), i.e. the two files share one object graph and
the boundary is plumbing. The hook simultaneously owns transport send helpers,
host-authority orchestration (`pushAuthority`, `applyHostAction`), optimistic
UI, echo bookkeeping, animation inference dispatch, lobby derivation, and
stats relay.

**Revision.** Extract a framework-free `OnlineGameClient` class (proposed:
`apps/web/src/online/onlineGameClient.ts`) owning the socket lifecycle, the
protocol switch, `SkipboHost` orchestration, echo counting, and an
`emit(viewEvent)` surface. The React hook becomes a thin adapter:
`useSyncExternalStore` over the client + the animation-inference layer, which
stays React-side because it touches the animation driver. This mirrors the
`SkipboHost` pattern that already works, makes reconnect/echo logic testable
without jsdom + fake sockets threaded through a hook, and dissolves the
23-parameter seam. Do this *after* F-4 so the client does not inherit the
globals.

### F-6: "Turn ends → next player draws" is encoded twice, differently

Local: `END_TURN`/`DISCARD_CARD` only flip `currentPlayerIndex`; the machine's
`drawing` state invokes `drawService` which dispatches `DRAW` (per the
invariant "start-of-turn draws stay outside `END_TURN`"). Online:
`applyOnlineAction` (`skipbo-runtime/src/gameLogic.ts:183-192`) detects the
index flip and immediately applies `DRAW` itself. Both are correct today, but
the turn-boundary rule lives in two owners; a change to draw timing (e.g.
drawing before revealing the previous player's discard) needs two edits in two
packages plus the animation inference in `helpers.ts` that reverse-engineers
the merged discard+draw view diff.

**Revision.** Add an explicit turn-boundary helper to `game-core`
(`advanceTurnWithDraw(state)` or a reducer meta-action `TURN_STARTED`) and
have both the machine's `drawService` and `applyOnlineAction` delegate to it.
Low urgency; do it opportunistically with the next turn-flow change.

### F-7: Two-step selection travels the wire and forces the echo machinery

Locally, `SELECT_CARD` → `PLAY_CARD` is the right UI grammar (a durable
invariant). Online, the same two-step grammar is sent as *two relayed moves*,
which is why one user gesture (drag = select + play inside one round trip)
produces two authoritative echoes and requires `pendingViewEchoesRef` /
`ingestRelayedView` stale-echo skipping — some of the subtlest code in the
client — plus a `SELECT_CARD` round trip that exists only to mirror transient
UI state into host state.

**Revision (protocol-affecting — needs a `skipbo-runtime` action-schema
addition, not a relay change).** Introduce a composite online move
`{ type: 'MOVE_CARD', from: {source, index, discardPileIndex?}, to:
{buildPile | discardPile} }` that the host validates and applies atomically
(select + play in one reducer sequence). Guests keep the two-step grammar
locally but relay one message per gesture; selection stops being host state
for remote seats (opponent selection display can ride a lightweight `event`
relay instead). This deletes the echo-counting invariant class entirely. Cost:
`skipboActionSchema` change + host/guest version discipline; keep v1 moves
accepted during transition.

### F-8: Minor consistencies worth sweeping

- **Shim re-exports**: `apps/web/src/state/gameReducer.ts`, `state/gameActions.ts`,
  `state/initialGameState.ts`, `lib/validators.ts`, `lib/handRefill.ts`,
  `lib/retreatPile.ts`, `types/index.ts` are one-line re-exports of
  `@skipbo/game-core` left from the package extraction. Some web code imports
  via the shims, some (e.g. `useOnlineSkipBoGame.ts:3`) imports the package
  directly — two names for one module. Delete the shims and import
  `@skipbo/game-core` everywhere.
- **Debug actions** (`DEBUG_*`, six types) are plumbed through the reducer, the
  machine, both hooks, and `gameLogic.ts` gating. Acceptable, but when F-1's
  intent module lands, route debug through one `debugActions.ts` helper so new
  debug tooling stops adding a case to five files.
- **`gameMachine` action casts**: the four `as unknown as` event casts in
  `apply*` actions disappear once F-2 moves `animationDuration` into a typed
  local event union.

## Target Shape After Revision

```
packages/game-core        rules, reducer (message codes), turn-boundary helper,
                          pure move-intent helpers (refill plan, empty-hand)
packages/skipbo-runtime   SkipboHost, composite MOVE_CARD in action schema,
                          redacted views (unchanged model)
apps/web
  src/game/               shared move-intent pipeline (both modes)
  src/state/gameMachine   turn engine w/ injected presentation driver,
                          no DOM/debug/global imports
  src/online/             framework-free OnlineGameClient (socket + host
                          orchestration + echo/optimistic reconciliation)
  src/hooks/              thin React adapters over machine / client
  src/services/           AnimationDriver implementation (no global setters)
```

Authority model, view redaction, snapshot sync, rendered-order invariants, and
the relay protocol all stay as decided in D-001/D-003/D-006/D-007.

## Phased Plan

Each phase is independently shippable and validated per the
[AGENTS.md](../../AGENTS.md) change matrix.

| Phase | Contents | Findings | Risk | Validation |
| ----- | -------- | -------- | ---- | ---------- |
| 1 | Dedupe move pipeline: pure helpers to `game-core`, shared intent module, delete shim re-exports | F-1, F-8 | Low | `game-core` + web unit tests; `pnpm test:e2e` |
| 2 | Message codes in reducer; move `animationDuration` off `GameAction` | F-2 | Medium (touches wire views + reducer tests) | `game-core`, `skipbo-runtime`, web state tests; two-browser smoke |
| 3 | AnimationDriver: kill global setters; inject driver into machine actors; extract `aiHand` debug parsing | F-3, F-4 | Medium (animation timing) | web state tests; `pnpm test:e2e`; visual contract |
| 4 | Extract `OnlineGameClient`; hook becomes adapter | F-5 | Medium-high (reconnect paths) | online hook tests rewritten against the client; two-browser smoke incl. host/guest reconnect |
| 5 | Composite `MOVE_CARD` online; retire echo counting | F-7 | High (protocol discipline) | `skipbo-runtime` tests; drag-and-drop E2E; mixed-version smoke |
| — | Turn-boundary helper | F-6 | Low | fold into whichever of phases 1–2 touches it first |

Phases 1–3 are pure consolidation and can proceed anytime. Phase 4 should
precede 5 (the client extraction is where echo logic lives). If only one phase
happens, make it Phase 1 — it removes the drift that makes every later change
a four-file edit.

## Docs To Move With The Work

- Phase 2 changes `ClientGameView` content → update
  [../protocols/realtime-events.md](../protocols/realtime-events.md) pointer target
  and [../architecture/online-multiplayer.md](../architecture/online-multiplayer.md).
- Phase 4/5 change client composition and the stale-echo invariant → update
  [../architecture/online-multiplayer.md](../architecture/online-multiplayer.md),
  [../architecture/runtime-invariants.md](../architecture/runtime-invariants.md),
  and add a decision-log entry when the composite move is accepted.
- Graduating any accepted piece of this note into `docs/architecture/*` follows
  [README.md](README.md) rules.
