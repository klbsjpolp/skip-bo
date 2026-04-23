# Architecture Decision Log

## Document Contract

- Purpose: record the repo's lightweight architectural decisions so they are easier to preserve or revisit.
- Audience: contributors and agents changing product shape, runtime boundaries, or deploy topology.
- Source of truth: the accepted decisions recorded here plus the owning code and docs linked from each entry.
- When to update: when a structural decision is added, replaced, or intentionally reversed.

Dates below are record dates for the log, not guaranteed original implementation dates.

## D-001: Offline-First Shell

- Status: accepted
- Recorded: 2026-04-06
- Decision: the app opens into local play against AI instead of a lobby-first shell.
- Why: local play is the fastest path to value and keeps the core game usable without backend availability.
- Implications: onboarding and README copy should treat online play as an additional capability, not the default shell.
- Related docs: [../../README.md](../../README.md), [online-multiplayer.md](online-multiplayer.md)

## D-002: Online Rooms Are Server-Authoritative

- Status: accepted
- Recorded: 2026-04-06
- Decision: the server owns shuffling, dealing, turn validation, and accepted-state progression for online rooms.
- Why: it prevents client divergence and reduces trust in browser-local state.
- Implications: the browser treats snapshots as canonical and protocol changes must update both backend enforcement and client-view docs.
- Related docs: [online-multiplayer.md](online-multiplayer.md), [../protocols/realtime-events.md](../protocols/realtime-events.md)

## D-003: Snapshot Sync Over Delta Replay

- Status: accepted
- Recorded: 2026-04-06
- Decision: online clients receive fresh redacted snapshots after accepted actions instead of replaying deltas.
- Why: snapshot sync simplifies correctness, redaction, and reconnect behavior at the current scale.
- Implications: animation logic must infer motion from state diffs, and protocol docs should describe snapshots as the contract surface.
- Related docs: [online-multiplayer.md](online-multiplayer.md), [../protocols/realtime-events.md](../protocols/realtime-events.md)

## D-004: Private Room-Code Join, No Lobby Or Matchmaking

- Status: superseded
- Recorded: 2026-04-06
- Decision: online games were originally private two-player rooms joined by room code rather than a public lobby or matchmaking system.
- Why: it kept scope and operating complexity small while still enabling real-time multiplayer.
- Implications: kept for historical context only. See D-006 for the current room model.
- Related docs: [../../README.md](../../README.md), [online-multiplayer.md](online-multiplayer.md)

## D-005: Single Advanced AI Profile

- Status: accepted
- Recorded: 2026-04-06
- Decision: the app ships one advanced AI profile and no user-facing difficulty selector.
- Why: one maintained profile simplifies testing, tuning, and documentation.
- Implications: docs should not reintroduce difficulty-mode language unless the runtime feature returns.
- Related docs: [../../apps/web/src/ai/README.md](../../apps/web/src/ai/README.md), [../backlog/ai-discard-strategy.md](../backlog/ai-discard-strategy.md)

## D-006: Four-Seat Rooms With In-Screen Waiting State

- Status: accepted
- Recorded: 2026-04-10
- Decision: online rooms now open as private four-seat waiting rooms joined by room code, with host-controlled start from the main play screen.
- Why: it keeps the product free of a separate lobby route while allowing 2, 3, or 4 human players to share the same room flow.
- Implications: room creation no longer implies an immediate active game, the status strip is the waiting-room control surface, and the server must lock active seats when the host starts.
- Related docs: [../../README.md](../../README.md), [online-multiplayer.md](online-multiplayer.md), [../protocols/realtime-events.md](../protocols/realtime-events.md)

## D-008: CloudWatch Alarm Budget Capped At 10

- Status: accepted
- Recorded: 2026-04-19
- Decision: the total number of active CloudWatch alarms must not exceed 10, matching the AWS Free Tier limit, unless the user explicitly instructs otherwise.
- Why: AWS charges $0.10/alarm/month beyond 10; keeping at or below 10 avoids any CloudWatch monitoring cost.
- Implications: when adding new monitored resources (Lambdas, tables, APIs), existing alarms must be pruned first. Lower-signal alarms (throttles on Lambda/DynamoDB) are dropped before higher-signal ones (errors, 5xx). AI/local Lambdas are excluded from monitoring as they are non-critical. Any agent or contributor proposing alarm additions must get explicit user approval and confirm the budget stays ≤ 10.
- Related docs: [../../infra/terraform/modules/monitoring/main.tf](../../infra/terraform/modules/monitoring/main.tf)

## D-007: Gen AI Is Advisory And Server-Mediated

- Status: accepted
- Recorded: 2026-04-18
- Decision: online coach and post-game summary features run through authenticated realtime backend routes, while local games may call unauthenticated local-insight routes only to rewrite deterministic coach and summary text.
- Why: it keeps secrets off the browser, preserves server authority for multiplayer, lets local games improve insight wording when a provider is configured, and prevents model output from bypassing deterministic card legality.
- Implications: online prompts must be built from redacted viewer-relative context, local prompts must be built only from deterministic recommendations or bounded action logs, and deterministic fallback text must remain available when model inference is disabled or unavailable. Production local-insight routes are protected with API Gateway throttling rather than user authentication.
- Related docs: [source-of-truth.md](source-of-truth.md), [runtime-invariants.md](runtime-invariants.md), [../protocols/realtime-events.md](../protocols/realtime-events.md)
