# OpenTofu AWS Realtime Runbook

## Document Contract

- Purpose: describe how to bootstrap, validate, and deploy the AWS realtime backend with OpenTofu.
- Audience: contributors and agents operating the Skip-Bo realtime backend.
- Source of truth: `infra/terraform/**`, `.github/workflows/ci.yml`, and `.github/workflows/deploy.yml`.
- When to update: when backend infrastructure, deployment workflows, secrets, or validation steps change.

## Related Docs

- [../architecture/online-multiplayer.md](../architecture/online-multiplayer.md)
- [../protocols/realtime-events.md](../protocols/realtime-events.md)
- [../../infra/terraform/README.md](../../infra/terraform/README.md)
- [../monitoring/SENTRY_AWS_INTEGRATION.md](../monitoring/SENTRY_AWS_INTEGRATION.md)

## Preconditions

- `pnpm install` has been run at the repo root.
- OpenTofu is installed locally if you are planning or applying from your machine.
- AWS credentials or an assumable role are available for the target account.
- The realtime API bundle can be built locally.

## Inputs

- remote-state backend settings for `infra/terraform/envs/prod/backend.hcl`
- `AWS_OPENTOFU_ROLE_ARN` or `AWS_DEPLOY_ROLE_ARN` for GitHub Actions
- `VITE_SKIPBO_API_URL` for frontend deployment after backend rollout
- optional `VITE_SENTRY_DSN`
- optional `BACKEND_SENTRY_DSN` or `SENTRY_DSN` GitHub secret if the backend should report to a different Sentry project than the browser
- optional `TF_VAR_sentry_dsn`, `TF_VAR_sentry_release`, and `TF_VAR_sentry_traces_sample_rate` for local plan or apply

## Steps

### One-Time Bootstrap

Create the remote-state infrastructure outside this stack:

- S3 bucket for OpenTofu state
- DynamoDB table for state locking
- an IAM role that GitHub Actions can assume for OpenTofu operations

Store the backend configuration as the GitHub secret `TOFU_BACKEND_CONFIG_HCL`. Example payload:

```hcl
bucket         = "skipbo-opentofu-state"
key            = "prod/opentofu.tfstate"
region         = "ca-central-1"
dynamodb_table = "skipbo-opentofu-locks"
encrypt        = true
```

Store the deployment role ARN as `AWS_OPENTOFU_ROLE_ARN`.

### Local Plan

```bash
pnpm install
pnpm --filter @skipbo/realtime-api build
tofu -chdir=infra/terraform/envs/prod init \
  -backend-config="bucket=skipbo-opentofu-state" \
  -backend-config="key=prod/opentofu.tfstate" \
  -backend-config="region=ca-central-1" \
  -backend-config="dynamodb_table=skipbo-opentofu-locks"
TF_VAR_sentry_dsn=your_backend_dsn \
TF_VAR_sentry_release=v$(node -p 'require("./package.json").version') \
pnpm tofu:plan
```

### Local Apply

```bash
pnpm --filter @skipbo/realtime-api build
TF_VAR_sentry_dsn=your_backend_dsn \
TF_VAR_sentry_release=v$(node -p 'require("./package.json").version') \
pnpm tofu:apply
```

### GitHub Actions Deploy

- `ci.yml` runs workspace checks and offline OpenTofu validation.
- `deploy.yml` creates the release commit and tag, deploys the backend when needed, rebuilds the frontend with runtime config, deploys GitHub Pages, and publishes the GitHub release.
- Backend deploy uses `TOFU_BACKEND_CONFIG_HCL` plus `AWS_OPENTOFU_ROLE_ARN` or `AWS_DEPLOY_ROLE_ARN`.
- Backend deploy resolves the Sentry DSN from `BACKEND_SENTRY_DSN`, then `SENTRY_DSN`, then `VITE_SENTRY_DSN`.

## Validation

1. Read the OpenTofu outputs and capture `http_api_url`.
2. Ensure the repository secret `VITE_SKIPBO_API_URL` points at that URL before rebuilding or redeploying the frontend.
3. Open two browser sessions.
4. Create a room in one browser and join it from the other.
5. Confirm room-code display, live selection sync, hidden opponent hand, and replay creating a fresh online room.

## Rollback

- If a bad infra change has not been applied yet, stop at plan review and fix the configuration.
- If a bad apply has already happened, revert the infra change in git, rebuild the realtime API if packaging inputs changed, and run a fresh plan and apply.
- If the backend URL changed unexpectedly, update `VITE_SKIPBO_API_URL` and redeploy the frontend so `apps/web/public/runtime-config.json` is regenerated from the current value.

## Failure Modes

- Missing or incorrect `backend.hcl` settings prevent OpenTofu from initializing remote state.
- Skipping the realtime API build can package stale Lambda artifacts.
- Missing AWS role secrets break GitHub Actions deployment.
- Forgetting to refresh `VITE_SKIPBO_API_URL` leaves the frontend pointed at the wrong backend.
- Missing Sentry variables disables backend release tagging and monitoring integration.
- When `TF_VAR_sentry_dsn` is set, backend tracing defaults to a `1.0` sample rate unless `TF_VAR_sentry_traces_sample_rate` overrides it.
