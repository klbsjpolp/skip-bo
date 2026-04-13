# Source Of Truth By Domain

## Document Contract

- Purpose: map each technical domain to the code and docs that currently own it.
- Audience: contributors and agents deciding where to inspect or update behavior first.
- Source of truth: the code files listed below; supporting docs explain them but do not override them.
- When to update: when responsibility boundaries, owning files, or supporting docs change.

If a domain spans multiple layers, start with the primary owner listed here and then follow the supporting links.

## Domain Map

| Domain | Primary source of truth | Supporting docs |
| --- | --- | --- |
| Gameplay rules and state mutations | `packages/game-core/src/state/gameReducer.ts` | [runtime-invariants.md](runtime-invariants.md) |
| Initial deal, stock sizing, and deck setup | `packages/game-core/src/state/initialGameState.ts` | [runtime-invariants.md](runtime-invariants.md) |
| Card legality rules | `packages/game-core/src/lib/validators.ts` | [runtime-invariants.md](runtime-invariants.md) |
| Local turn orchestration and draw ownership | `apps/web/src/state/gameMachine.ts` | [runtime-invariants.md](runtime-invariants.md), [../../AGENTS.md](../../AGENTS.md) |
| Human interaction orchestration and local play animations | `apps/web/src/hooks/useSkipBoGame.ts`, `apps/web/src/hooks/useLocalSkipBoGame.ts` | [runtime-invariants.md](runtime-invariants.md), [../runbooks/change-checklists.md](../runbooks/change-checklists.md) |
| Web runtime config and PWA update gating | `apps/web/src/lib/runtimeConfig.ts`, `apps/web/src/lib/pwaUpdates.ts`, `apps/web/src/hooks/usePwaVersionGate.ts` | `.github/workflows/deploy.yml`, [../runbooks/opentofu-aws-realtime.md](../runbooks/opentofu-aws-realtime.md) |
| AI move selection and heuristics | `apps/web/src/ai/computeBestMove.ts`, `apps/web/src/ai/lookAheadStrategy.ts`, `apps/web/src/ai/discardUtils.ts`, `apps/web/src/ai/aiConfig.ts` | [../../apps/web/src/ai/README.md](../../apps/web/src/ai/README.md), [../backlog/ai-discard-strategy.md](../backlog/ai-discard-strategy.md) |
| AI and draw animation services | `apps/web/src/services/aiAnimationService.ts`, `apps/web/src/services/drawAnimationService.ts`, `apps/web/src/services/animationGate.ts` | [runtime-invariants.md](runtime-invariants.md) |
| Dev-only browser fixtures | `apps/web/src/testing/uiFixtures.ts`, `apps/web/src/App.tsx` | [../runbooks/change-checklists.md](../runbooks/change-checklists.md) |
| Online room lifecycle and turn validation | `apps/realtime-api/src/services/roomService.ts` | [online-multiplayer.md](online-multiplayer.md), [../protocols/realtime-events.md](../protocols/realtime-events.md) |
| Online DTOs, room codes, and redacted client views | `packages/multiplayer-protocol/src/index.ts`, `packages/multiplayer-protocol/src/views/index.ts` | [../protocols/realtime-events.md](../protocols/realtime-events.md) |
| Online client-side snapshot handling and inferred opponent animations | `apps/web/src/hooks/useOnlineSkipBoGame.ts` | [online-multiplayer.md](online-multiplayer.md), [runtime-invariants.md](runtime-invariants.md) |
| Infrastructure topology and deployment inputs | `infra/terraform/**` | [../runbooks/opentofu-aws-realtime.md](../runbooks/opentofu-aws-realtime.md), [../../infra/terraform/README.md](../../infra/terraform/README.md) |
| CI, release, and deploy automation | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `package.json`, `.versionrc.json` | [decision-log.md](decision-log.md), [../runbooks/opentofu-aws-realtime.md](../runbooks/opentofu-aws-realtime.md) |
| Monitoring integration | `apps/realtime-api/src/monitoring/sentry.ts`, web Sentry bootstrap, `infra/terraform/modules/monitoring/**` | [../monitoring/SENTRY_AWS_INTEGRATION.md](../monitoring/SENTRY_AWS_INTEGRATION.md) |
| Test coverage ownership | `packages/game-core/tests`, `packages/multiplayer-protocol/tests`, `apps/realtime-api/tests`, `apps/web/src/**/__tests__`, `apps/web/tests/ui` | [../runbooks/change-checklists.md](../runbooks/change-checklists.md), [../../AGENTS.md](../../AGENTS.md) |

## How To Use This Map

- If the change is behavioral, inspect the primary owner before reading secondary docs.
- If the change spans multiple domains, update each owning doc only once the code owner is clear.
- If a stable doc starts repeating multiple domains, move the ownership details back into this file instead.
