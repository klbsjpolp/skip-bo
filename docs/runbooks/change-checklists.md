# Change Checklists

## Document Contract

- Purpose: provide procedural checklists and validation rules for common change zones in this repo.
- Audience: contributors and agents preparing or reviewing a code change.
- Source of truth: the owning code and tests referenced from [../architecture/source-of-truth.md](../architecture/source-of-truth.md); this doc defines the expected validation workflow.
- When to update: when test ownership, validation commands, or change zones move.

## Validation Decision Tree

- If the change touches reducer legality or card rules, update `packages/game-core/tests` first.
- If that same change also affects turn flow, draws, animation gating, or `currentPlayerIndex` progression, update `apps/web/src/state/__tests__` too.
- If the change touches AI scoring, search, selection planning, or discard heuristics, update `apps/web/src/ai/__tests__`.
- If the change touches rendered gameplay behavior, run `pnpm test:e2e`.
- If the change affects shared board layout, fixture-visible UI, `.player-area`, `.center-area`, or the `ready-human` fixture, run `pnpm --filter @skipbo/web exec playwright test tests/ui/theme-contract.spec.ts --project=chromium-desktop`.
- If the UI change is intentional and screenshot diffs are expected, run `pnpm test:visual:update` and keep the snapshot updates in the same change.
- If the change touches realtime DTOs, redaction rules, room codes, or room lifecycle, update `packages/multiplayer-protocol/tests` and `apps/realtime-api/tests`.
- If the change touches infra or deployment workflows, run `pnpm tofu:fmt` and `pnpm --dir infra/terraform validate:offline:prod`.

## Gameplay Checklist

- Inspect `packages/game-core/src/state/gameReducer.ts`, `packages/game-core/src/lib/validators.ts`, and `packages/game-core/src/state/initialGameState.ts`.
- Update `packages/game-core/tests`.
- Update `apps/web/src/state/__tests__` if turn flow or browser-owned orchestration changed.
- Update [../architecture/runtime-invariants.md](../architecture/runtime-invariants.md) if a cross-cutting rule changed.
- Update protocol docs too if the same rule is enforced online.

## AI Checklist

- Inspect `apps/web/src/ai/computeBestMove.ts`, `apps/web/src/ai/lookAheadStrategy.ts`, `apps/web/src/ai/discardUtils.ts`, and `apps/web/src/ai/aiConfig.ts`.
- Update `apps/web/src/ai/__tests__`.
- Update state tests too if the AI change depends on reducer sequencing or selection persistence.
- Update [../../apps/web/src/ai/README.md](../../apps/web/src/ai/README.md) when runtime behavior or module boundaries changed.
- Update [../backlog/ai-discard-strategy.md](../backlog/ai-discard-strategy.md) only when future-work hypotheses changed.

## UI And Animation Checklist

- Inspect the relevant components, hooks, services, and fixtures.
- Update component tests when interaction or rendering behavior changed.
- Run `pnpm test:e2e` for visible behavior changes.
- Run the desktop theme-contract suite for shared board or fixture-visible layout changes.
- Refresh visual baselines with `pnpm test:visual:update` when the visual change is intentional.
- Update [../architecture/runtime-invariants.md](../architecture/runtime-invariants.md) if player-order or animation ownership assumptions changed.

## Realtime Protocol Checklist

- Inspect `apps/realtime-api/src/services/roomService.ts`, `packages/multiplayer-protocol/src/index.ts`, and `packages/multiplayer-protocol/src/views/index.ts`.
- Update `apps/realtime-api/tests`.
- Update `packages/multiplayer-protocol/tests`.
- Update [../protocols/realtime-events.md](../protocols/realtime-events.md).
- Update [../architecture/online-multiplayer.md](../architecture/online-multiplayer.md) if authority boundaries, snapshot flow, or redaction responsibilities changed.
- Update [../architecture/decision-log.md](../architecture/decision-log.md) if the decision itself changed.
- Smoke-test with two browser sessions when end-to-end online behavior changed.

## Infra And Deploy Checklist

- Inspect `infra/terraform/**`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, and any touched package scripts.
- Run `pnpm tofu:fmt`.
- Run `pnpm --dir infra/terraform validate:offline:prod`.
- Rebuild `@skipbo/realtime-api` if Lambda packaging inputs changed.
- Update [opentofu-aws-realtime.md](opentofu-aws-realtime.md) and [../../infra/terraform/README.md](../../infra/terraform/README.md).
- Update [../monitoring/SENTRY_AWS_INTEGRATION.md](../monitoring/SENTRY_AWS_INTEGRATION.md) if alarms, Sentry wiring, or monitoring ownership changed.
- Update the decision log if the deployment topology or operating model changed.

## Release Notes Trigger

If the change alters user-visible gameplay, online product shape, deployment expectations, or supported contributor workflow, update the relevant human-facing docs in the same change rather than relying on the changelog later.
