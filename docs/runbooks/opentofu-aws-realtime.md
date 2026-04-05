# OpenTofu AWS Realtime Runbook

## One-time bootstrap

Create the remote-state infrastructure once outside this stack:

- S3 bucket for OpenTofu state
- DynamoDB table for state locking
- An IAM role GitHub Actions can assume with OpenTofu permissions

Store the backend configuration as a GitHub secret named `TOFU_BACKEND_CONFIG_HCL`. Example payload:

```hcl
bucket         = "skipbo-opentofu-state"
key            = "prod/opentofu.tfstate"
region         = "ca-central-1"
dynamodb_table = "skipbo-opentofu-locks"
encrypt        = true
```

Store the deployment role ARN as `AWS_OPENTOFU_ROLE_ARN`.

To enable backend Sentry in the production apply workflow, make sure `VITE_SENTRY_DSN` is available to that workflow too. The workflow will attach `v<package.json version>` as the Sentry release automatically.

## Local plan flow

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

## Local apply flow

```bash
pnpm --filter @skipbo/realtime-api build
TF_VAR_sentry_dsn=your_backend_dsn \
TF_VAR_sentry_release=v$(node -p 'require("./package.json").version') \
pnpm tofu:apply
```

## GitHub Actions flow

- `ci.yml` runs offline OpenTofu format, validate, and plan checks.
- `deploy-aws.yml` reruns those checks for backend changes.
- Manual production apply happens through `deploy-aws.yml` with `apply=true`.
- Protect the `aws-prod` environment with required reviewers if you want GitHub to enforce manual approval before apply.

## After deployment

1. Copy the `http_api_url` OpenTofu output into the `VITE_SKIPBO_API_URL` GitHub secret used by the web deployment workflow.
2. Redeploy the web app so the workflow rewrites `apps/web/public/runtime-config.json` with the live backend URL.
3. Open two browsers, create a room, join it with the second browser, and confirm:
   - room code display
   - live selection sync
   - hidden opponent hand
   - replay creating a fresh online room
