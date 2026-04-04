# OpenTofu Infrastructure

This directory manages the AWS multiplayer backend for Skip-Bo with OpenTofu.

## Layout

- `modules/dynamodb`: room and connection tables
- `modules/iam`: Lambda execution role and data-plane policies
- `modules/realtime_api`: Lambda functions plus HTTP and WebSocket API Gateway resources
- `modules/monitoring`: minimal CloudWatch alarms
- `envs/prod`: the production environment wiring those modules together

## Bootstrap

The production environment expects a pre-created remote-state bucket and lock table. The backend is intentionally left as an empty `s3` block so credentials and state names can be injected per environment.

Example init command:

```bash
tofu -chdir=infra/terraform/envs/prod init \
  -backend-config="bucket=skipbo-opentofu-state" \
  -backend-config="key=prod/opentofu.tfstate" \
  -backend-config="region=ca-central-1" \
  -backend-config="dynamodb_table=skipbo-opentofu-locks"
```

## Day-to-day commands

Build the backend bundle first, because OpenTofu packages `apps/realtime-api/dist` into the Lambda zip artifact:

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

## Environment variables

The web app needs the deployed HTTP API base URL at build time:

```bash
VITE_SKIPBO_API_URL=https://<http-api-id>.execute-api.ca-central-1.amazonaws.com
```

The Lambda functions receive their room table, connection table, and WebSocket endpoint settings directly from OpenTofu.

Backend Sentry monitoring is optional. You can enable it by passing `sentry_dsn`, plus optional `sentry_release` and `sentry_traces_sample_rate`, through `terraform.tfvars`, `-var`, or `TF_VAR_...` environment variables.

The production HTTP API defaults to `allowed_origins = ["*"]` because the multiplayer endpoints do not use cookies or browser credentials, and local Vite dev ports can vary between runs.
