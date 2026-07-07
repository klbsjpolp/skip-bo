# AGENTS.md

## Document Contract

- Purpose: give coding agents an executable workflow for making safe changes in this repo.
- Audience: AI coding agents and automation operating inside the repository.
- Source of truth: the code files and canonical docs linked from this file; if this file disagrees with code, verify the code first.
- When to update: when architecture, source-of-truth ownership, validations, or contributor workflows change.

## Before Changing Code

1. Classify the change before editing anything: gameplay, turn flow, AI, UI/animation, realtime protocol, infra/deploy, or docs-only.
2. Open [docs/architecture/source-of-truth.md](docs/architecture/source-of-truth.md) and inspect the owning code files for that domain.
3. Read [docs/architecture/runtime-invariants.md](docs/architecture/runtime-invariants.md) before touching reducer flow, animations, AI sequencing, or online state handling.
4. Use the change matrix below to decide which tests and docs must move with the code.
5. If a detail appears in a section marked as likely to drift, re-check the code or workflow file instead of copying the doc text forward.

## Durable Invariants To Preserve

Canonical wording lives in [docs/architecture/runtime-invariants.md](docs/architecture/runtime-invariants.md). Before you merge a change, confirm that you did not break these expectations:

- hands remain fixed-length arrays with `null` holes
- card interactions still resolve through selection first, then play or discard
- `selectedCard` keeps planned destinations long enough for AI resolution
- `Skip-Bo` cards remain playable as wildcards and may be discarded (official rule)
- start-of-turn draws stay outside `END_TURN`
- online play is host-authoritative: the server relays opaque messages; the host seat owns the game and redacts hidden information
- local player order and rendered player order are not the same thing

## Likely To Drift

Do not hardcode these from memory. Re-verify them in code or workflows when they matter:

- exact GitHub workflow filenames, job names, and secret wiring
- exact Node/OpenTofu version requirements
- exact AI search depth, weights, and artificial delays
- exact state-machine phase names
- exact CSS selectors or DOM structure beyond the documented runtime invariants

## Change Matrix

| Change type                                     | Inspect first                                                                                                                                                                             | Tests and validation                                                                                                                                                                                                                                                        | Docs to update                                                                                                                                                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gameplay rules or card legality                 | `packages/game-core/src/state/gameReducer.ts`, `packages/game-core/src/lib/validators.ts`, `packages/game-core/src/state/initialGameState.ts`                                             | Update `packages/game-core/tests` first. If turn flow changes, also update `apps/web/src/state/__tests__`.                                                                                                                                                                  | [docs/architecture/runtime-invariants.md](docs/architecture/runtime-invariants.md) if behavior changed, plus [docs/architecture/source-of-truth.md](docs/architecture/source-of-truth.md) if ownership moved.     |
| Local turn flow, draw flow, or animation gating | `apps/web/src/state/gameMachine.ts`, `apps/web/src/hooks/useSkipBoGame.ts`, `apps/web/src/hooks/useLocalSkipBoGame.ts`, animation services                                                | Update `apps/web/src/state/__tests__`. Run browser validation if the board flow or animation timing changed.                                                                                                                                                                | [docs/architecture/runtime-invariants.md](docs/architecture/runtime-invariants.md) and [docs/runbooks/change-checklists.md](docs/runbooks/change-checklists.md).                                                  |
| AI heuristics or search                         | `apps/web/src/ai/computeBestMove.ts`, `apps/web/src/ai/lookAheadStrategy.ts`, `apps/web/src/ai/discardUtils.ts`, `apps/web/src/ai/aiConfig.ts`                                            | Update `apps/web/src/ai/__tests__`. Add state tests too if reducer assumptions changed.                                                                                                                                                                                     | [apps/web/src/ai/README.md](apps/web/src/ai/README.md). Update [docs/backlog/ai-discard-strategy.md](docs/backlog/ai-discard-strategy.md) only if roadmap or hypotheses changed.                                  |
| UI, fixtures, or animation presentation         | Relevant components, `apps/web/src/testing/uiFixtures.ts`, animation hooks and services                                                                                                   | Update component tests as needed. Run `pnpm test:e2e`. If fixture-visible layout changed, run `pnpm --filter @skipbo/web exec playwright test tests/ui/theme-contract.spec.ts --project=chromium-desktop`. If visuals changed intentionally, run `pnpm test:visual:update`. | [docs/runbooks/change-checklists.md](docs/runbooks/change-checklists.md) and [docs/architecture/runtime-invariants.md](docs/architecture/runtime-invariants.md) if player-order or animation assumptions changed. |
| Realtime relay protocol or room lifecycle       | Lives in [realtime-infra](https://github.com/klbsjpolp/realtime-infra) (`@klbsjpolp/realtime-core` + the relay server). This repo only consumes the published `@klbsjpolp/realtime-core`. | Change the protocol/server in realtime-infra. Here, bump the `@klbsjpolp/realtime-core` version and run the automated two-browser test: `pnpm --filter @skipbo/web exec playwright test tests/ui/online-multiplayer.spec.ts` (uses the in-repo mock relay, `apps/web/tests/mock-relay/`).                                                                                                                                           | [docs/architecture/online-multiplayer.md](docs/architecture/online-multiplayer.md), and the decision log if the architecture changed.                                                                             |
| Host-authoritative Skip-Bo runtime or redaction | `packages/skipbo-runtime/src/{hostRuntime,gameLogic,views,actionSchema}.ts`                                                                                                               | Update `packages/skipbo-runtime/tests`. Run the automated two-browser test (`pnpm --filter @skipbo/web exec playwright test tests/ui/online-multiplayer.spec.ts`, includes a hidden-hand redaction check) when redaction or rules changed.                                                                                                                                              | [docs/protocols/realtime-events.md](docs/protocols/realtime-events.md) and [docs/architecture/online-multiplayer.md](docs/architecture/online-multiplayer.md).                                                    |
| Frontend deploy or release flow                 | `.github/workflows/*.yml`, `package.json`, `.versionrc.json`                                                                                                                              | The deploy workflow ships the web app to GitHub Pages only; the backend deploys from realtime-infra. Verify the workflow and the web build.                                                                                                                                 | [docs/monitoring/SENTRY_AWS_INTEGRATION.md](docs/monitoring/SENTRY_AWS_INTEGRATION.md) if monitoring changed.                                                                                                     |
| Documentation structure or agent guidance       | [docs/documentation-standards.md](docs/documentation-standards.md), [docs/README.md](docs/README.md), this file                                                                           | Manually verify links and section roles.                                                                                                                                                                                                                                    | Update the affected docs together; do not move one doc role without updating the index and standards doc.                                                                                                         |

## Mandatory Validations

Use this decision tree, not guesswork:

- If reducer legality changed, update `packages/game-core/tests` first.
- If the change also affects turn progression, draw timing, or state-machine sequencing, update `apps/web/src/state/__tests__` too.
- If AI scoring, search, or discard logic changed, update `apps/web/src/ai/__tests__`.
- If any visible board behavior changed, run `pnpm test:e2e`.
- If the change touches shared board layout, fixture-visible UI, `.player-area`, `.center-area`, or `ready-human`, run `pnpm --filter @skipbo/web exec playwright test tests/ui/theme-contract.spec.ts --project=chromium-desktop`.
- If the UI change is intentional and broad screenshot diffs are expected, refresh the baselines with `pnpm test:visual:update` in the same change.
- Relay DTOs, room codes, and WebSocket message shapes live in the realtime-infra repo (`@klbsjpolp/realtime-core`) — change them there. If Skip-Bo redaction or move rules changed, update `packages/skipbo-runtime/tests`.
- If frontend deploy or workflow behavior changed, verify `.github/workflows` and the web build.
- For zone-specific checklists, use [docs/runbooks/change-checklists.md](docs/runbooks/change-checklists.md).

## Do Not Change Without Updating

- Do not change runtime invariants without updating [docs/architecture/runtime-invariants.md](docs/architecture/runtime-invariants.md).
- Do not change source ownership or responsibility boundaries without updating [docs/architecture/source-of-truth.md](docs/architecture/source-of-truth.md).
- The realtime relay contract lives in [realtime-infra](https://github.com/klbsjpolp/realtime-infra) (`@klbsjpolp/realtime-core`) — change it there, not here.
- Do not change multiplayer architecture assumptions without updating [docs/architecture/online-multiplayer.md](docs/architecture/online-multiplayer.md) and [docs/architecture/decision-log.md](docs/architecture/decision-log.md) when the decision itself changed.
- Do not treat backlog notes as runtime truth. Exploratory material belongs under [docs/backlog/README.md](docs/backlog/README.md).

## Common Traps

- `players[0]` and `players[1]` are state order; the rendered board order is different.
- `END_TURN` is not the place to add start-of-turn draw logic.
- Removing a hand card means writing `null`, not splicing.
- Online play is host-authoritative: the server relays opaque messages and never sees game state; the host seat owns the game and redacts hidden information.
- `apps/web/src/ai/README.md` is stable module guidance; `docs/backlog/*` is non-normative.
- If a doc sounds descriptive but you need an implementation detail, check the owning code file before acting.

## Definition Of Done For Agents

Before finishing, confirm all of the following:

- You inspected the source-of-truth files for the changed domain.
- You preserved the runtime invariants or updated their canonical doc.
- You ran every validation required by the change matrix or explicitly reported what you could not run.
- You updated contracts, runbooks, or backlog docs when the change affected them.
- You did not copy likely-to-drift details into a stable doc without re-verifying them.
- You checked moved or renamed Markdown links after editing.
- You left the repo in a state where another agent can find the current truth quickly.
