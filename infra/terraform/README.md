# OpenTofu Infrastructure

## Document Contract

- Purpose: orient contributors inside the OpenTofu directory and point to the operational runbook.
- Audience: contributors and agents changing AWS infrastructure or deployment wiring.
- Source of truth: `infra/terraform/**`, especially `envs/prod` and `modules/*`.
- When to update: when directory layout, day-to-day commands, or infra ownership changes.

This directory owns the production AWS infrastructure for the realtime backend. Use the runbook for step-by-step operations and this file for directory-level orientation.

## Layout

- `modules/dynamodb`: room and connection tables
- `modules/iam`: Lambda execution role and data-plane policies
- `modules/realtime_api`: Lambda functions plus HTTP and WebSocket API Gateway resources
- `modules/monitoring`: CloudWatch alarms and monitoring wiring
- `envs/prod`: production environment composition
- `scripts/validate-offline-prod.sh`: offline validation wrapper used by CI and local checks

## Daily Commands

Build the realtime API bundle first when Lambda packaging inputs changed:

```bash
pnpm --filter @skipbo/realtime-api build
pnpm tofu:fmt
pnpm tofu:validate
pnpm tofu:plan
```

Apply after reviewing the plan:

```bash
pnpm tofu:apply
```

## Related Docs

- [../../docs/runbooks/opentofu-aws-realtime.md](../../docs/runbooks/opentofu-aws-realtime.md)
- [../../docs/architecture/source-of-truth.md](../../docs/architecture/source-of-truth.md)
- [../../docs/monitoring/SENTRY_AWS_INTEGRATION.md](../../docs/monitoring/SENTRY_AWS_INTEGRATION.md)
