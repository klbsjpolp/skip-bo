# Documentation Index

## Document Contract

- Purpose: provide a single navigation entrypoint to the repo's human and agent documentation.
- Audience: humans and agents looking for the right doc before making or reviewing a change.
- Source of truth: the linked documents in this directory and the code files they reference.
- When to update: when docs move, gain a new role, or a new documentation category is introduced.

## Start Here

- Humans new to the repo: begin with [../README.md](../README.md).
- Agents or automation: begin with [../AGENTS.md](../AGENTS.md).
- Anyone touching behavior: read [architecture/source-of-truth.md](architecture/source-of-truth.md) and [architecture/runtime-invariants.md](architecture/runtime-invariants.md) before relying on secondary docs.

## Documentation Map

### Standards

- [documentation-standards.md](documentation-standards.md): how docs in this repo should be written and maintained.

### Architecture

- [architecture/source-of-truth.md](architecture/source-of-truth.md): code ownership by domain.
- [architecture/runtime-invariants.md](architecture/runtime-invariants.md): invariants that changes must preserve.
- [architecture/online-multiplayer.md](architecture/online-multiplayer.md): how the online system fits together.
- [architecture/decision-log.md](architecture/decision-log.md): lightweight record of structural decisions.

### Protocols

- [protocols/realtime-events.md](protocols/realtime-events.md): HTTP and WebSocket contracts for online rooms.

### Runbooks

- [runbooks/opentofu-aws-realtime.md](runbooks/opentofu-aws-realtime.md): bootstrap, plan, apply, and smoke-test flow for the AWS backend.
- [runbooks/change-checklists.md](runbooks/change-checklists.md): procedural checklists and validation rules by change zone.

### Monitoring

- [monitoring/SENTRY_AWS_INTEGRATION.md](monitoring/SENTRY_AWS_INTEGRATION.md): Sentry-specific AWS integration notes.

### Historical Investigations

- [investigations/README.md](investigations/README.md): dated investigation notes and bug writeups.

### Code-Adjacent Module Docs

- [../apps/web/src/ai/README.md](../apps/web/src/ai/README.md): stable AI module orientation near the code.
- [../infra/terraform/README.md](../infra/terraform/README.md): OpenTofu directory guide.

### Backlog And Design Notes

- [backlog/README.md](backlog/README.md): rules for non-normative design docs.
- [backlog/ai-discard-strategy.md](backlog/ai-discard-strategy.md): AI discard-strategy backlog note.

## Role Boundaries

- `README.md` stays short and human-oriented.
- `AGENTS.md` holds executable agent guidance, not general onboarding.
- `docs/architecture/*` explains stable structure and decisions.
- `docs/protocols/*` defines contracts.
- `docs/runbooks/*` defines procedures and validations.
- `docs/backlog/*` is explicitly non-normative.
- `docs/investigations/*` holds dated historical notes.
